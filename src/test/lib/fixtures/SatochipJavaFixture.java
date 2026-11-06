import java.lang.reflect.Field;
import java.math.BigInteger;
import java.security.*;
import java.util.Arrays;
import java.util.HexFormat;
import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.bouncycastle.asn1.*;
import org.bouncycastle.crypto.digests.SHA256Digest;
import org.bouncycastle.crypto.params.*;
import org.bouncycastle.crypto.signers.*;
import org.bouncycastle.jce.ECNamedCurveTable;
import org.bouncycastle.jce.spec.*;
import org.satochip.client.*;
import org.satochip.io.*;

public class SatochipJavaFixture {
  static final ECParameterSpec CURVE = ECNamedCurveTable.getParameterSpec("secp256k1");
  static final ECDomainParameters DOMAIN = new ECDomainParameters(CURVE.getCurve(), CURVE.getG(), CURVE.getN(), CURVE.getH());
  static final HexFormat HEX = HexFormat.of();
  static byte[] cat(byte[]... values) {
    int total = Arrays.stream(values).mapToInt(x -> x.length).sum();
    byte[] out = new byte[total]; int offset = 0;
    for (byte[] value : values) { System.arraycopy(value, 0, out, offset, value.length); offset += value.length; }
    return out;
  }
  static byte[] sized(byte[] value) { return cat(new byte[]{(byte)(value.length >> 8),(byte)value.length}, value); }
  static void put(Object target, String name, Object value) throws Exception {
    Field f = target.getClass().getDeclaredField(name); f.setAccessible(true); f.set(target, value);
  }
  static byte[] get(Object target, String name) throws Exception {
    Field f = target.getClass().getDeclaredField(name); f.setAccessible(true); return (byte[])f.get(target);
  }
  static byte[] sign(byte[] message, int scalar) throws Exception {
    ECDSASigner signer = new ECDSASigner(new HMacDSAKCalculator(new SHA256Digest()));
    signer.init(true, new ECPrivateKeyParameters(BigInteger.valueOf(scalar), DOMAIN));
    BigInteger[] rs = signer.generateSignature(MessageDigest.getInstance("SHA-256").digest(message));
    return new DERSequence(new ASN1Encodable[]{new ASN1Integer(rs[0]),new ASN1Integer(rs[1])}).getEncoded();
  }
  static byte[] proof(int scalar, boolean derived) throws Exception {
    byte[] x = Arrays.copyOfRange(CURVE.getG().multiply(BigInteger.valueOf(scalar)).getEncoded(true), 1, 33);
    byte[] chain = new byte[derived ? 32 : 0]; Arrays.fill(chain,(byte)0x42);
    byte[] message = cat(chain, sized(x));
    byte[] authenticated = cat(message, sized(sign(message, scalar)));
    return cat(authenticated, sized(sign(authenticated, 4)));
  }
  static void print(String name, byte[] value) { System.out.println(name+"="+HEX.formatHex(value)); }
  public static void main(String[] args) throws Exception {
    SecureChannelSession session = new SecureChannelSession();
    KeyFactory factory = KeyFactory.getInstance("ECDSA", BouncyCastle.PROVIDER);
    PrivateKey privateKey = factory.generatePrivate(new ECPrivateKeySpec(BigInteger.ONE,CURVE));
    PublicKey publicKey = factory.generatePublic(new ECPublicKeySpec(CURVE.getG(),CURVE));
    put(session,"keyPair",new KeyPair(publicKey,privateKey));
    put(session,"publicKey",CURVE.getG().getEncoded(false));
    put(session,"random",new SecureRandom(){public void nextBytes(byte[] value){for(int i=0;i<value.length;i++)value[i]=(byte)i;}});
    byte[] cardPublic = CURVE.getG().multiply(BigInteger.TWO).getEncoded(false);
    session.initiateSecureChannel(cardPublic);
    print("clientPublicKey",session.getPublicKey());
    print("cardPublicKey",cardPublic);
    print("sharedX",get(session,"secret"));
    print("aesKey",get(session,"derived_key"));
    print("macKey",get(session,"mac_key"));
    print("verifyPin",session.encrypt_secure_channel(new APDUCommand(0xb0,0x42,0,0,"135790".getBytes())).serialize());
    print("derive",session.encrypt_secure_channel(new APDUCommand(0xb0,0x6d,5,0x40,HEX.parseHex("8000005680000001800000000000000000000000"))).serialize());
    byte[] responsePlain = proof(3,true);
    byte[] iv = HEX.parseHex("505152535455565758595a5b00000002");
    Cipher cipher = Cipher.getInstance("AES/CBC/PKCS7PADDING",BouncyCastle.PROVIDER);
    cipher.init(Cipher.ENCRYPT_MODE,new SecretKeySpec(get(session,"derived_key"),"AES"),new IvParameterSpec(iv));
    byte[] response = cat(iv,sized(cipher.doFinal(responsePlain)));
    print("encryptedResponse",response);
    print("decryptedResponse",session.decrypt_secure_channel(new APDUResponse(response,(byte)0x90,(byte)0)).getData());
    byte[] initProof = proof(2,false);
    byte[] deriveProof = proof(3,true);
    print("initProof",initProof);
    print("deriveProof",deriveProof);
    SatochipParser parser = new SatochipParser();
    print("parsedInitPublic",parser.parseInitiateSecureChannel(new APDUResponse(initProof,(byte)0x90,(byte)0)));
    print("parsedDerivedPublic",parser.parseBip32GetExtendedKey(new APDUResponse(deriveProof,(byte)0x90,(byte)0))[0]);
  }
}
