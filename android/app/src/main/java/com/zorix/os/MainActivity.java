package com.zorix.os;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.Context;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;
import org.json.JSONObject;

/**
 * ZorixOS - hybrid Android UI demo, not an Android ROM/launcher replacement.
 * The full interactive HTML UI is bundled in app/src/main/assets/index.html.
 */
public final class MainActivity extends Activity {
    private static final int CAMERA_REQUEST = 410;
    private static final int FILE_CHOOSER_REQUEST = 411;
    private static final String ASSET_URL =
            "https://appassets.androidplatform.net/assets/index.html?android=1";

    private WebView webView;
    private PermissionRequest pendingCameraRequest;
    private ValueCallback<Uri[]> pendingFileChooser;
    private ConnectivityManager connectivity;
    private ConnectivityManager.NetworkCallback activeNetworkCallback;
    private boolean observingNetwork = false;
    private final Object networkMonitor = new Object();
    /** Script bridge exposes read-only connectivity metadata, not privileged Wi-Fi toggles. */
    private final class NetworkBridge {
        @JavascriptInterface public String getState() { return networkStateJson(); }
        @JavascriptInterface public void openInternetSettings() {
            runOnUiThread(() -> {
                try {
                    Intent panel;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q)
                        panel = new Intent(Settings.Panel.ACTION_INTERNET_CONNECTIVITY);
                    else panel = new Intent(Settings.ACTION_WIRELESS_SETTINGS);
                    startActivity(panel);
                } catch (Exception ignored) { }
            });
        }
    }
    private String networkStateJson() {
        JSONObject result = new JSONObject();
        try {
            ConnectivityManager c = connectivity;
            Network network = c != null ? c.getActiveNetwork() : null;
            NetworkCapabilities caps = network != null ? c.getNetworkCapabilities(network) : null;
            boolean connected = caps != null;
            boolean wifi = connected && caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI);
            boolean cellular = connected && caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR);
            boolean ethernet = connected && caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET);
            boolean vpn = connected && caps.hasTransport(NetworkCapabilities.TRANSPORT_VPN);
            String transport = !connected ? "Offline" : wifi ? "Wi-Fi" : cellular ? "Cellular" : ethernet ? "Ethernet" : vpn ? "VPN" : "Other";
            result.put("source", "android");
            result.put("connected", connected);
            result.put("validated", connected && caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED));
            result.put("wifi", wifi);
            result.put("cellular", cellular);
            result.put("ethernet", ethernet);
            result.put("vpn", vpn);
            result.put("transport", transport);
            result.put("metered", c != null && c.isActiveNetworkMetered());
            // These are Android link-bandwidth estimates, not a speed test.
            result.put("downKbps", connected ? caps.getLinkDownstreamBandwidthKbps() : 0);
            result.put("upKbps", connected ? caps.getLinkUpstreamBandwidthKbps() : 0);
            result.put("readAtMs", System.currentTimeMillis());
        } catch (Exception error) {
            try { result.put("source", "android"); result.put("connected", false); result.put("transport", "Unavailable"); }
            catch (Exception ignored) { }
        }
        return result.toString();
    }
    private void sendNetworkState() {
        if (webView == null) return;
        final String data = networkStateJson();
        runOnUiThread(() -> {
            if (webView != null)
                webView.evaluateJavascript("window.ZorixNativeNetwork && window.ZorixNativeNetwork(" + JSONObject.quote(data) + ");", null);
        });
    }
    private void startNetworkObserving() {
        if (observingNetwork) return;
        try {
            activeNetworkCallback = new ConnectivityManager.NetworkCallback() {
                @Override public void onAvailable(Network network) { sendNetworkState(); }
                @Override public void onLost(Network network) { sendNetworkState(); }
                @Override public void onCapabilitiesChanged(Network network, NetworkCapabilities caps) { sendNetworkState(); }
            };
            if (connectivity != null) {
                connectivity.registerDefaultNetworkCallback(activeNetworkCallback);
                observingNetwork = true;
            }
        } catch (Exception ignored) { observingNetwork = false; }
    }
    private void stopNetworkObserving() {
        if (!observingNetwork || connectivity == null || activeNetworkCallback == null) return;
        try { connectivity.unregisterNetworkCallback(activeNetworkCallback); }
        catch (Exception ignored) { }
        observingNetwork = false;
    }

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setBackgroundDrawableResource(android.R.color.black);
        connectivity = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        goImmersive();

        WebViewAssetLoader assets = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();
        webView = new WebView(this);
        webView.addJavascriptInterface(new NetworkBridge(), "ZorixNetwork");
        webView.setBackgroundColor(Color.rgb(10, 14, 27));
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setOffscreenPreRaster(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setUserAgentString(settings.getUserAgentString() + " ZorixOSAndroid/4.0");

        webView.setWebViewClient(new WebViewClient() {
            @Override public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                sendNetworkState();
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assets.shouldInterceptRequest(request.getUrl());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                Uri uri = request.getUrl();
                if ("appassets.androidplatform.net".equals(uri.getHost())) return false;
                String scheme = uri.getScheme();
                if ("https".equals(scheme) || "http".equals(scheme)) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
                    catch (Exception ignored) { }
                    return true;
                }
                return !"about".equals(scheme);
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public void onPermissionRequest(PermissionRequest request) {
                boolean cameraRequested = false;
                for (String res : request.getResources()) {
                    if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(res)) cameraRequested = true;
                }
                if (!cameraRequested) { request.deny(); return; }
                runOnUiThread(() -> {
                    if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                        request.grant(new String[]{ PermissionRequest.RESOURCE_VIDEO_CAPTURE });
                    } else {
                        pendingCameraRequest = request;
                        requestPermissions(new String[]{ Manifest.permission.CAMERA }, CAMERA_REQUEST);
                    }
                });
            }
            @Override public boolean onShowFileChooser(WebView view,
                    ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (pendingFileChooser != null) pendingFileChooser.onReceiveValue(null);
                pendingFileChooser = callback;
                try {
                    startActivityForResult(params.createIntent(), FILE_CHOOSER_REQUEST);
                    return true;
                } catch (Exception ex) {
                    pendingFileChooser = null;
                    callback.onReceiveValue(null);
                    return false;
                }
            }
        });
        setContentView(webView);
        webView.loadUrl(ASSET_URL);
    }

    @Override public void onRequestPermissionsResult(int code, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(code, permissions, results);
        if (code != CAMERA_REQUEST || pendingCameraRequest == null) return;
        PermissionRequest req = pendingCameraRequest;
        pendingCameraRequest = null;
        if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED)
            req.grant(new String[]{ PermissionRequest.RESOURCE_VIDEO_CAPTURE });
        else req.deny();
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_CHOOSER_REQUEST || pendingFileChooser == null) return;
        pendingFileChooser.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
        pendingFileChooser = null;
    }

    @Override protected void onStart() {
        super.onStart();
        startNetworkObserving();
    }
    @Override protected void onStop() {
        stopNetworkObserving();
        super.onStop();
    }
    @Override public void onBackPressed() {
        if (webView != null) {
            webView.evaluateJavascript("if(document.querySelector('#zxOnboarding:not(.hidden)') && !document.querySelector('#zxOnboarding').hidden){document.querySelector('#zxOnboarding [data-zx-step=back]')?.click()}else if(typeof osBack==='function'){osBack();}else if(typeof goHome==='function'){goHome();}", null);
        } else super.onBackPressed();
    }

    private void goImmersive() {
        final View decor = getWindow().getDecorView();
        decor.setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_FULLSCREEN |
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
            View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
            View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.setSystemBarsBehavior(
                    WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
            }
        }
    }
    @Override protected void onResume() {
        super.onResume();
        goImmersive();
    }
    @Override public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) goImmersive();
    }
    @Override public void onDestroy() {
        stopNetworkObserving();
        if (pendingCameraRequest != null) pendingCameraRequest.deny();
        if (pendingFileChooser != null) pendingFileChooser.onReceiveValue(null);
        if (webView != null) { webView.destroy(); webView = null; }
        super.onDestroy();
    }
}
