const fs = require('fs');
const path = require('path');

// Read the git commit hash from the master branch
const gitDir = path.join(__dirname, '../.git');
const commitHashPath = path.join(gitDir, 'refs', 'heads', 'master');

try {
    const commitHash = fs.readFileSync(commitHashPath, 'utf8').trim().substring(0, 8);
    const isDirty = fs.readFileSync(path.join(gitDir, 'index'), 'utf8').trim().length > 0;
    // Write the commit hash to the TypeScript file
    const output = `export const gitCommit = '${commitHash}${isDirty ? '-dirty' : ''}';`;
    fs.writeFileSync(path.join(__dirname, '../src/_gitCommit.ts'), output);
    
    console.log('Git commit hash successfully written to _gitCommit.ts');
} catch (error) {
    console.error('Error reading git commit hash:', error);
    process.exit(1);
}
