import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.Executors;


public class Main {
    private static final int PORT = 4173;
    private static final String URL = "http://127.0.0.1:" + PORT;

    private static final Map<String, String> MIME = Map.ofEntries(
            Map.entry("html", "text/html; charset=utf-8"),
            Map.entry("htm", "text/html; charset=utf-8"),
            Map.entry("js", "text/javascript; charset=utf-8"),
            Map.entry("mjs", "text/javascript; charset=utf-8"),
            Map.entry("css", "text/css; charset=utf-8"),
            Map.entry("json", "application/json; charset=utf-8"),
            Map.entry("webmanifest", "application/manifest+json; charset=utf-8"),
            Map.entry("png", "image/png"),
            Map.entry("jpg", "image/jpeg"),
            Map.entry("jpeg", "image/jpeg"),
            Map.entry("gif", "image/gif"),
            Map.entry("svg", "image/svg+xml"),
            Map.entry("ico", "image/x-icon"),
            Map.entry("woff", "font/woff"),
            Map.entry("woff2", "font/woff2"),
            Map.entry("map", "application/json"),
            Map.entry("txt", "text/plain; charset=utf-8")
    );

    public static void main(String[] args) {
        System.out.println("========================================");
        System.out.println("  RUSH HOUR");
        System.out.println("========================================");
        System.out.println();

        Path www = findWwwFolder();
        if (www == null) {
            System.err.println("ERROR: Could not find www/index.html");
            System.err.println("user.dir = " + System.getProperty("user.dir"));
            System.err.println("In IntelliJ: Run → Edit Configurations → Working directory");
            System.err.println("set to the project folder that contains the www folder.");
            return;
        }

        System.out.println("Serving: " + www.toAbsolutePath());

        HttpServer server = null;
        if (httpOk(URL)) {
            System.out.println("Port " + PORT + " already in use — reusing it.");
        } else {
            try {
                server = startStaticServer(www, PORT);
                System.out.println("Server ready: " + URL);
            } catch (IOException e) {
                System.err.println("Could not bind port " + PORT + ": " + e.getMessage());
                // Try alternate ports so Chrome still has something to open
                for (int alt = PORT + 1; alt <= PORT + 10 && server == null; alt++) {
                    try {
                        server = startStaticServer(www, alt);
                        System.out.println("Server ready on alternate port: http://127.0.0.1:" + alt);
                    } catch (IOException ignored) {
                        /* try next */
                    }
                }
                if (server == null) {
                    System.err.println("No free port found. Close other apps using ports " + PORT + "-" + (PORT + 10));
                    return;
                }
            }
        }

        String openUrl = URL;
        if (server != null) {
            int bound = server.getAddress().getPort();
            openUrl = "http://127.0.0.1:" + bound;
        }

        if (!waitUntilReady(openUrl, 50, 100)) {
            System.err.println("Server did not become ready at " + openUrl);
            if (server != null) server.stop(0);
            return;
        }

        System.out.println("Opening Chrome → " + openUrl);
        boolean chromeOk = openInChrome(openUrl);
        if (!chromeOk) {
            System.err.println();
            System.err.println("Chrome was not found or failed to start.");
            System.err.println("Install Google Chrome, or open this URL manually:");
            System.err.println("  " + openUrl);
        }

        System.out.println();
        System.out.println("Leave this window open while you play.");
        System.out.println("Press Ctrl+C (or stop the run in IntelliJ) to quit.");

        if (server != null) {
            try {
                Thread.currentThread().join();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                server.stop(0);
            }
        }
    }

    private static HttpServer startStaticServer(Path wwwRoot, int port) throws IOException {
        Path root = wwwRoot.toAbsolutePath().normalize();
        // Bind IPv4 loopback so Chrome always reaches us (avoids localhost → ::1 issues)
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", port), 0);
        server.createContext("/", exchange -> handleStatic(exchange, root));
        server.setExecutor(Executors.newCachedThreadPool());
        server.start();
        return server;
    }

    private static void handleStatic(HttpExchange exchange, Path root) throws IOException {
        try {
            String method = exchange.getRequestMethod();
            if (!"GET".equalsIgnoreCase(method) && !"HEAD".equalsIgnoreCase(method)) {
                exchange.getResponseHeaders().add("Allow", "GET, HEAD");
                exchange.sendResponseHeaders(405, -1);
                return;
            }

            String path = exchange.getRequestURI().getPath();
            if (path == null || path.isBlank() || "/".equals(path)) {
                path = "/index.html";
            }

            // Drop leading slash; block "." traversal
            String rel = path.startsWith("/") ? path.substring(1) : path;
            try {
                rel = java.net.URLDecoder.decode(rel, StandardCharsets.UTF_8);
            } catch (Exception ignored) {
                /* keep raw */
            }

            Path file = root.resolve(rel).normalize();
            if (!file.startsWith(root) || !Files.isRegularFile(file)) {
                if (!rel.contains(".")) {
                    file = root.resolve("index.html");
                }
            }

            if (!file.startsWith(root) || !Files.isRegularFile(file)) {
                byte[] msg = "404 Not Found".getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().set("Content-Type", "text/plain; charset=utf-8");
                exchange.sendResponseHeaders(404, msg.length);
                if (!"HEAD".equalsIgnoreCase(method)) {
                    try (OutputStream os = exchange.getResponseBody()) {
                        os.write(msg);
                    }
                }
                return;
            }

            String name = file.getFileName().toString();
            int dot = name.lastIndexOf('.');
            String ext = dot >= 0 ? name.substring(dot + 1).toLowerCase(Locale.ROOT) : "";
            String type = MIME.getOrDefault(ext, "application/octet-stream");
            byte[] data = Files.readAllBytes(file);

            exchange.getResponseHeaders().set("Content-Type", type);
            exchange.getResponseHeaders().set("Cache-Control", "no-cache");
            exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");

            if ("HEAD".equalsIgnoreCase(method)) {
                exchange.sendResponseHeaders(200, -1);
            } else {
                exchange.sendResponseHeaders(200, data.length);
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(data);
                }
            }
        } catch (Exception e) {
            byte[] msg = ("500 " + e.getMessage()).getBytes(StandardCharsets.UTF_8);
            try {
                exchange.getResponseHeaders().set("Content-Type", "text/plain; charset=utf-8");
                exchange.sendResponseHeaders(500, msg.length);
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(msg);
                }
            } catch (IOException ignored) {
                /* already failed */
            }
        } finally {
            exchange.close();
        }
    }

    /** Locate www/ next to package.json, walking from cwd, user.dir, and class output path. */
    private static Path findWwwFolder() {
        Path[] seeds = {
                Path.of("").toAbsolutePath(),
                Path.of(System.getProperty("user.dir", ".")).toAbsolutePath(),
                classLocationDir(),
        };

        for (Path seed : seeds) {
            if (seed == null) continue;
            Path p = seed;
            for (int i = 0; i < 10 && p != null; i++) {
                Path www = p.resolve("www");
                if (Files.isRegularFile(www.resolve("index.html"))) {
                    return www.toAbsolutePath().normalize();
                }
                // Nested project folder name used on Desktop
                Path nested = p.resolve("Endless game.java").resolve("www");
                if (Files.isRegularFile(nested.resolve("index.html"))) {
                    return nested.toAbsolutePath().normalize();
                }
                p = p.getParent();
            }
        }
        return null;
    }

    private static Path classLocationDir() {
        try {
            URL loc = Main.class.getProtectionDomain().getCodeSource().getLocation();
            if (loc == null) return null;
            Path path = Paths.get(loc.toURI());
            if (Files.isRegularFile(path)) path = path.getParent();
            return path;
        } catch (Exception e) {
            return null;
        }
    }

    private static boolean waitUntilReady(String url, int attempts, long sleepMs) {
        for (int i = 0; i < attempts; i++) {
            if (httpOk(url)) return true;
            try {
                Thread.sleep(sleepMs);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return false;
            }
        }
        return httpOk(url);
    }

    private static boolean httpOk(String url) {
        try {
            var conn = (java.net.HttpURLConnection) URI.create(url).toURL().openConnection();
            conn.setConnectTimeout(600);
            conn.setReadTimeout(600);
            conn.setRequestMethod("GET");
            conn.setInstanceFollowRedirects(false);
            int code = conn.getResponseCode();
            conn.disconnect();
            return code >= 200 && code < 500;
        } catch (Exception e) {
            return false;
        }
    }


    private static boolean openInChrome(String url) {
        Path chrome = findChromeExecutable();
        if (chrome != null) {
            // Direct exe launch — most reliable on Windows
            try {
                new ProcessBuilder(chrome.toAbsolutePath().toString(), url)
                        .redirectErrorStream(true)
                        .redirectOutput(ProcessBuilder.Redirect.DISCARD)
                        .start();
                System.out.println("Chrome: " + chrome.toAbsolutePath());
                return true;
            } catch (Exception e) {
                System.out.println("Direct Chrome launch failed: " + e.getMessage());
            }

            // Windows: start with full path (empty window title required by `start`)
            try {
                new ProcessBuilder(
                        "cmd.exe", "/c", "start", "",
                        chrome.toAbsolutePath().toString(),
                        url
                ).start();
                System.out.println("Chrome via start: " + chrome.toAbsolutePath());
                return true;
            } catch (Exception e) {
                System.out.println("start Chrome failed: " + e.getMessage());
            }
        }

        // PATH / App Paths registration
        try {
            String os = System.getProperty("os.name", "").toLowerCase(Locale.ROOT);
            if (os.contains("win")) {
                new ProcessBuilder("cmd.exe", "/c", "start", "", "chrome", url).start();
                System.out.println("Chrome via PATH name 'chrome'");
                return true;
            }
            if (os.contains("mac")) {
                new ProcessBuilder("open", "-a", "Google Chrome", url).start();
                System.out.println("Chrome via macOS open -a");
                return true;
            }
            new ProcessBuilder("google-chrome", url).start();
            System.out.println("Chrome via google-chrome");
            return true;
        } catch (Exception e) {
            System.out.println("Chrome fallback failed: " + e.getMessage());
            return false;
        }
    }

    private static Path findChromeExecutable() {
        String local = System.getenv("LOCALAPPDATA");
        String pf = System.getenv("ProgramFiles");
        String pf86 = System.getenv("ProgramFiles(x86)");
        String home = System.getProperty("user.home");

        String[] candidates = {
                pf != null ? pf + "\\Google\\Chrome\\Application\\chrome.exe" : null,
                pf86 != null ? pf86 + "\\Google\\Chrome\\Application\\chrome.exe" : null,
                local != null ? local + "\\Google\\Chrome\\Application\\chrome.exe" : null,
                home != null ? home + "\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe" : null,
                "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
                "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
                // Beta / Dev / Canary as last resorts (still Chromium Chrome family)
                local != null ? local + "\\Google\\Chrome Beta\\Application\\chrome.exe" : null,
                local != null ? local + "\\Google\\Chrome Dev\\Application\\chrome.exe" : null,
                local != null ? local + "\\Google\\Chrome SxS\\Application\\chrome.exe" : null,
        };

        for (String c : candidates) {
            if (c == null) continue;
            Path p = Paths.get(c);
            if (Files.isRegularFile(p)) return p;
        }

        // Search PATH for chrome.exe
        String pathEnv = System.getenv("PATH");
        if (pathEnv != null) {
            for (String dir : pathEnv.split(";")) {
                if (dir == null || dir.isBlank()) continue;
                Path p = Paths.get(dir.trim(), "chrome.exe");
                if (Files.isRegularFile(p)) return p;
            }
        }
        return null;
    }
}
