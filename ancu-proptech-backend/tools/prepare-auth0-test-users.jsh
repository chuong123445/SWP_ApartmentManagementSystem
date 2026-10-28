import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.*;
import java.util.zip.*;
import tools.jackson.databind.ObjectMapper;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

// Chạy tại thư mục Backend. Không gọi Auth0, không ghi credentials vào source/Git.
{
    var source=Path.of("../docs/samples/auth0/users.json");
    var output=Path.of("target/auth0-test-users-2026-10-28");
    if(Files.exists(output))throw new IllegalStateException("Pack already exists; preserve passwords already imported. Move the pack before generating a new one.");
    var json=new ObjectMapper();
    List<?> profiles=json.readValue(Files.readString(source,StandardCharsets.UTF_8),List.class);
    if(profiles.size()!=10)throw new IllegalStateException("Expected ten reviewed profiles.");
    var bcrypt=new BCryptPasswordEncoder(10);var random=new SecureRandom();
    var imports=new ArrayList<Map<String,Object>>();
    var credentials=new StringBuilder("# Tài khoản Auth0 để kiểm thử\n\nDữ liệu cá nhân/tài sản hư cấu. Password chỉ dùng ở màn hình Auth0; không phải password nội bộ An Cư. Không commit/share công khai file này hoặc file ZIP.\n\n| Email | Mật khẩu Auth0 | Họ tên | Tài sản | Căn/phòng |\n|---|---|---|---:|---:|\n");
    Files.createDirectories(output.resolve("create-users"));
    int assetCount=0,unitCount=0;
    for(Object entry:profiles){
        var profile=new LinkedHashMap<String,Object>();
        for(var field:((Map<?,?>)entry).entrySet())profile.put((String)field.getKey(),field.getValue());
        var email=(String)profile.get("email");
        byte[] bytes=new byte[15];random.nextBytes(bytes);
        var password="Aa9!"+Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        var hash=bcrypt.encode(password);
        if(!hash.startsWith("$2a$10$")||!bcrypt.matches(password,hash))throw new IllegalStateException("Hash verification failed.");
        var bulk=new LinkedHashMap<String,Object>(profile);bulk.put("password_hash",hash);imports.add(bulk);
        var single=new LinkedHashMap<String,Object>(profile);single.put("password",password);
        Files.writeString(output.resolve("create-users/"+email.substring(0,email.indexOf('@'))+".json"),json.writerWithDefaultPrettyPrinter().writeValueAsString(single)+"\n",StandardCharsets.UTF_8);
        var vneid=(Map<?,?>)((Map<?,?>)profile.get("app_metadata")).get("vneid");
        var assets=(List<?>)vneid.get("assets");int units=0;for(Object asset:assets)units+=((List<?>)((Map<?,?>)asset).get("units")).size();
        assetCount+=assets.size();unitCount+=units;
        credentials.append("| ").append(email).append(" | `").append(password).append("` | ").append(profile.get("name")).append(" | ").append(assets.size()).append(" | ").append(units).append(" |\n");
    }
    if(assetCount!=21||unitCount!=43)throw new IllegalStateException("Unexpected reviewed asset/unit counts.");
    var bulkFile=output.resolve("auth0-users-import.json");
    Files.writeString(bulkFile,json.writerWithDefaultPrettyPrinter().writeValueAsString(imports)+"\n",StandardCharsets.UTF_8);
    if(Files.size(bulkFile)>500_000)throw new IllegalStateException("Bulk file too large.");
    Files.writeString(output.resolve("TAI-KHOAN-VA-MAT-KHAU.md"),credentials.toString(),StandardCharsets.UTF_8);
    Files.copy(source,output.resolve("users.json"));
    Files.copy(Path.of("../docs/samples/auth0/README.md"),output.resolve("README.md"));
    var zipPath=Path.of("target/auth0-test-users-2026-10-28.zip");
    try(var zip=new ZipOutputStream(Files.newOutputStream(zipPath));var files=Files.walk(output)){
        for(var file:files.filter(Files::isRegularFile).sorted().toList()){
            zip.putNextEntry(new ZipEntry(output.relativize(file).toString().replace('\\','/')));Files.copy(file,zip);zip.closeEntry();
        }
    }
    System.out.println("PASS: prepared10users/21assets/43units; bcrypt10verified; private import/Create/password files and ZIP under ignored target.");
}
/exit
