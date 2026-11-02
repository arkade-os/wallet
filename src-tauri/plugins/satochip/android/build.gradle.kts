import java.net.HttpURLConnection
import java.net.URI
import java.security.MessageDigest
import java.util.zip.ZipInputStream
import org.gradle.api.DefaultTask
import org.gradle.api.file.DirectoryProperty
import org.gradle.api.provider.Property
import org.gradle.api.tasks.CacheableTask
import org.gradle.api.tasks.Input
import org.gradle.api.tasks.OutputDirectory
import org.gradle.api.tasks.TaskAction
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
}

val connectorRevision = "ad297f14d1dbc0bb6f09e6ba17ca468f945d2a62"
val connectorArchiveHash = "76c6774b5487237083f8a5a37e86453ebca70efc1ffaae432b2138052ea1e9e2"
val connectorSources = layout.buildDirectory.dir("satochip-java/$connectorRevision")

@CacheableTask
abstract class FetchSatochipSources : DefaultTask() {
    @get:Input abstract val revision: Property<String>
    @get:Input abstract val archiveHash: Property<String>
    @get:OutputDirectory abstract val sourceDirectory: DirectoryProperty

    @TaskAction
    fun fetch() {
        val archive = File(temporaryDir, "satochip-java.zip")
        val connection = URI("https://codeload.github.com/Toporin/Satochip-Java/zip/${revision.get()}")
            .toURL().openConnection() as HttpURLConnection
        connection.connectTimeout = 30_000
        connection.readTimeout = 60_000
        archive.parentFile.mkdirs()
        connection.inputStream.use { input -> archive.outputStream().use { input.copyTo(it) } }
        val actual = MessageDigest.getInstance("SHA-256").digest(archive.readBytes())
            .joinToString("") { "%02x".format(it) }
        check(actual == archiveHash.get()) { "Satochip Java source archive checksum mismatch" }
        val root = sourceDirectory.get().asFile
        val prefix = "Satochip-Java-${revision.get()}/"
        ZipInputStream(archive.inputStream()).use { zip ->
            var entry = zip.nextEntry
            while (entry != null) {
                val relative = entry.name.removePrefix(prefix)
                val sourcePrefix = "satochip-lib/src/main/java/"
                val target = when {
                    relative.startsWith(sourcePrefix) && relative.endsWith(".java") ->
                        File(root, relative.removePrefix(sourcePrefix))
                    relative == "LICENSE" -> File(root, "LICENSE")
                    else -> null
                }
                if (target != null && !entry.isDirectory) {
                    check(target.canonicalPath.startsWith(root.canonicalPath + File.separator))
                    target.parentFile.mkdirs()
                    target.outputStream().use { zip.copyTo(it) }
                }
                entry = zip.nextEntry
            }
        }
    }
}

val fetchSatochipSources = tasks.register<FetchSatochipSources>("fetchSatochipSources") {
    revision.set(connectorRevision)
    archiveHash.set(connectorArchiveHash)
    sourceDirectory.set(connectorSources)
}

android {
    namespace = "io.arkade.satochip"
    compileSdk = 36
    defaultConfig {
        minSdk = 24
        consumerProguardFiles("consumer-rules.pro")
    }
    buildFeatures { buildConfig = true }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
}

kotlin {
    compilerOptions { jvmTarget = JvmTarget.JVM_11 }
}

androidComponents {
    onVariants { variant ->
        variant.sources.java?.addGeneratedSourceDirectory(fetchSatochipSources, FetchSatochipSources::sourceDirectory)
    }
}

dependencies {
    implementation(project(":tauri-android"))
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.fasterxml.jackson.core:jackson-databind:2.18.3")
    implementation("org.bouncycastle:bcprov-jdk15to18:1.86")
    testImplementation("junit:junit:4.13.2")
}
