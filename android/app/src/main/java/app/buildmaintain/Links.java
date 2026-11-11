package app.buildmaintain;

import java.io.UnsupportedEncodingException;
import java.net.URI;
import java.net.URLDecoder;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Link and file-name rules, plain Java so they can be unit-tested without a phone. */
final class Links {
    private static final Pattern ENCODED_NAME = Pattern.compile("filename\\*\\s*=\\s*[\\w-]+''([^;]+)", Pattern.CASE_INSENSITIVE);
    private static final Pattern PLAIN_NAME = Pattern.compile("filename\\s*=\\s*\"?([^\";]+)\"?", Pattern.CASE_INSENSITIVE);

    private Links() {}

    /** True when Android should open the link in another app: WhatsApp, phone, mail, other websites. */
    static boolean isExternal(String url, String startUrl) {
        URI link;
        try {
            link = URI.create(url);
        } catch (IllegalArgumentException e) {
            return false;
        }
        String scheme = link.getScheme() == null ? "" : link.getScheme().toLowerCase(Locale.ROOT);
        switch (scheme) {
            case "about": case "data": case "blob": case "javascript": case "":
                return false;
            case "http": case "https":
                URI start = URI.create(startUrl);
                return !(start.getHost().equalsIgnoreCase(link.getHost()) && start.getPort() == link.getPort());
            default:
                return true;
        }
    }

    /** Display name for a downloaded file: the server's name if it sent one, else from the URL, always with an extension. */
    static String fileName(String url, String contentDisposition, String mime) {
        String name = null;
        if (contentDisposition != null) {
            Matcher encoded = ENCODED_NAME.matcher(contentDisposition);
            Matcher plain = PLAIN_NAME.matcher(contentDisposition);
            if (encoded.find()) {
                try {
                    name = URLDecoder.decode(encoded.group(1).trim(), "UTF-8");
                } catch (UnsupportedEncodingException e) {
                    throw new AssertionError(e);
                }
            } else if (plain.find()) {
                name = plain.group(1).trim();
            }
        }
        if (name == null && !url.startsWith("blob:")) {
            try {
                String path = URI.create(url).getPath();
                if (path != null) name = path.substring(path.lastIndexOf('/') + 1);
            } catch (IllegalArgumentException ignored) {
                // fall through to the generic name
            }
        }
        if (name == null || name.isEmpty()) name = "download";
        name = name.replaceAll("[\\\\/:*?\"<>|]", "_");
        if (!name.contains(".")) name += extension(mime);
        return name;
    }

    private static String extension(String mime) {
        switch (mime == null ? "" : mime.toLowerCase(Locale.ROOT)) {
            case "application/pdf": return ".pdf";
            case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": return ".xlsx";
            case "image/png": return ".png";
            case "image/jpeg": return ".jpg";
            case "text/csv": return ".csv";
            default: return "";
        }
    }
}
