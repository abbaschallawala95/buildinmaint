package app.buildmaintain;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.os.SystemClock;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebBackForwardList;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import java.io.OutputStream;
import java.net.URISyntaxException;
import org.json.JSONObject;

/** The whole app: the Build Maintain site in the app's own WebView, plus what a browser would normally do for it. */
public class MainActivity extends Activity {
    private static final String START_URL = BuildConfig.START_URL;

    // Runs on every page: keeps blob: links readable long enough to save them, and routes window.print to Android.
    private static final String PAGE_SCRIPT =
        "if(!window.__bm){window.__bm=1;"
        + "const revoke=URL.revokeObjectURL.bind(URL);"
        + "URL.revokeObjectURL=u=>setTimeout(()=>revoke(u),60000);"
        + "window.print=()=>BuildMaintain.print();}";

    private static final String OFFLINE_PAGE =
        "<html><head><meta name='viewport' content='width=device-width,initial-scale=1'></head>"
        + "<body style='margin:0;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;"
        + "background:#0F1222;color:#fff;font-family:sans-serif;text-align:center'>"
        + "<h2>No connection</h2><p style='opacity:.7;padding:0 24px'>Check your internet, then try again.</p>"
        + "<button onclick='BuildMaintain.retry()' style='margin-top:12px;padding:12px 32px;border:0;border-radius:8px;"
        + "background:#5B5BD6;color:#fff;font-size:16px'>Retry</button></body></html>";

    private WebView web;
    private String failedUrl;
    private long lastPrint;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        web = new WebView(this);
        setContentView(web);

        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setSupportMultipleWindows(false); // window.open loads in this same screen
        CookieManager.getInstance().setAcceptCookie(true);

        web.addJavascriptInterface(new Bridge(), "BuildMaintain");
        web.setWebViewClient(new Client());
        web.setDownloadListener((url, userAgent, contentDisposition, mime, length) -> download(url, contentDisposition, mime));

        if (savedInstanceState == null) web.loadUrl(START_URL);
        else web.restoreState(savedInstanceState);
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }

    @Override
    protected void onPause() {
        super.onPause();
        CookieManager.getInstance().flush(); // keep the login if Android closes the app
    }

    @Override
    @SuppressWarnings("deprecation") // targetSdk 34 without predictive back, so this still runs
    public void onBackPressed() {
        WebBackForwardList history = web.copyBackForwardList();
        int target = history.getCurrentIndex() - 1;
        while (target >= 0 && Links.skipOnBack(history.getItemAtIndex(target).getUrl())) target--;
        if (Links.isHome(web.getUrl()) || target < 0) super.onBackPressed();
        else web.goBackOrForward(target - history.getCurrentIndex());
    }

    private class Client extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            String url = request.getUrl().toString();
            if (!Links.isExternal(url, START_URL)) return false;
            openOutside(url);
            return true;
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            view.evaluateJavascript(PAGE_SCRIPT, null);
            Uri page = Uri.parse(url);
            if (page.getPath() != null && page.getPath().startsWith("/receipt/") && "1".equals(page.getQueryParameter("print"))) {
                printPage();
            }
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (!request.isForMainFrame()) return;
            failedUrl = request.getUrl().toString();
            view.loadDataWithBaseURL(null, OFFLINE_PAGE, "text/html", "utf-8", null);
        }
    }

    private void openOutside(String url) {
        try {
            Intent intent = url.startsWith("intent:")
                ? Intent.parseUri(url, Intent.URI_INTENT_SCHEME)
                : new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            startActivity(intent);
        } catch (ActivityNotFoundException | URISyntaxException e) {
            toast("No app on this phone can open that link.");
        }
    }

    // Fetch inside the page, so the login cookie goes along and blob: links work, then hand the bytes to save().
    private void download(String url, String contentDisposition, String mime) {
        String name = Links.fileName(url, contentDisposition, mime);
        String js = "(async()=>{try{"
            + "const r=await fetch(" + JSONObject.quote(url) + ",{credentials:'include'});"
            + "if(!r.ok)throw new Error(r.status);"
            + "const b=await r.blob();"
            + "const d=await new Promise((ok,no)=>{const f=new FileReader();f.onload=()=>ok(f.result);f.onerror=no;f.readAsDataURL(b);});"
            + "BuildMaintain.save(d.slice(d.indexOf(',')+1)," + JSONObject.quote(name) + ",b.type||" + JSONObject.quote(mime) + ");"
            + "}catch(e){BuildMaintain.saveFailed();}})()";
        toast("Downloading " + name + "…");
        web.evaluateJavascript(js, null);
    }

    private void printPage() {
        long now = SystemClock.elapsedRealtime();
        if (now - lastPrint < 2000) return; // the page and the app can both ask for the same print
        lastPrint = now;
        String name = "Build Maintain receipt";
        PrintManager printer = (PrintManager) getSystemService(PRINT_SERVICE);
        printer.print(name, web.createPrintDocumentAdapter(name), null);
    }

    private void toast(String message) {
        runOnUiThread(() -> Toast.makeText(this, message, Toast.LENGTH_LONG).show());
    }

    /** Called from page JavaScript (on a background thread). */
    private class Bridge {
        @JavascriptInterface
        public void retry() {
            runOnUiThread(() -> web.loadUrl(failedUrl != null ? failedUrl : START_URL));
        }

        @JavascriptInterface
        public void print() {
            runOnUiThread(MainActivity.this::printPage);
        }

        @JavascriptInterface
        public void saveFailed() {
            toast("Download failed. Please try again.");
        }

        @JavascriptInterface
        public void save(String base64, String name, String mime) {
            boolean image = mime.startsWith("image/");
            ContentValues values = new ContentValues();
            values.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
            values.put(MediaStore.MediaColumns.MIME_TYPE, mime);
            values.put(MediaStore.MediaColumns.RELATIVE_PATH,
                image ? Environment.DIRECTORY_PICTURES + "/Build Maintain" : Environment.DIRECTORY_DOWNLOADS);
            Uri collection = image ? MediaStore.Images.Media.EXTERNAL_CONTENT_URI : MediaStore.Downloads.EXTERNAL_CONTENT_URI;
            try {
                Uri file = getContentResolver().insert(collection, values);
                if (file == null) throw new IllegalStateException("insert failed");
                try (OutputStream out = getContentResolver().openOutputStream(file)) {
                    out.write(Base64.decode(base64, Base64.DEFAULT));
                }
                toast("Saved " + name + " to " + (image ? "Pictures/Build Maintain" : "Downloads"));
            } catch (Exception e) {
                toast("Could not save " + name + ".");
            }
        }
    }
}
