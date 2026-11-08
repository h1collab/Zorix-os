package com.zorix.os;
import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.webkit.WebViewAssetLoader;
public final class MainActivity extends Activity {
  private static final int CAMERA_REQ=410, CHOOSER_REQ=411;
  private WebView web;
  private PermissionRequest cameraReq;
  private ValueCallback<Uri[]> chooser;
  @Override public void onCreate(Bundle state) {
    super.onCreate(state); immersive();
    WebViewAssetLoader loader=new WebViewAssetLoader.Builder()
      .addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).build();
    web=new WebView(this);web.setBackgroundColor(Color.rgb(9,13,28));
    web.setOverScrollMode(View.OVER_SCROLL_NEVER);
    WebSettings prefs=web.getSettings();
    prefs.setJavaScriptEnabled(true);prefs.setDomStorageEnabled(true);
    prefs.setMediaPlaybackRequiresUserGesture(true);
    prefs.setAllowFileAccess(false);prefs.setAllowContentAccess(true);
    prefs.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
    prefs.setUserAgentString(prefs.getUserAgentString()+" ZorixOSAndroid/1.0");
    web.setWebViewClient(new WebViewClient(){
      @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest r){
        return loader.shouldInterceptRequest(r.getUrl());
      }
      @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){
        if(!r.isForMainFrame())return false;
        Uri u=r.getUrl();
        if("appassets.androidplatform.net".equals(u.getHost()))return false;
        String s=u.getScheme();
        if("https".equals(s)||"http".equals(s)){
          try{startActivity(new Intent(Intent.ACTION_VIEW,u));}catch(Exception ignored){}
          return true;
        }
        return !"about".equals(s);
      }
    });
    web.setWebChromeClient(new WebChromeClient(){
      @Override public void onPermissionRequest(PermissionRequest req){
        boolean needsCamera=false;
        for(String resource:req.getResources())
          if(PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource))needsCamera=true;
        if(!needsCamera){req.deny();return;}
        runOnUiThread(()->{
          if(checkSelfPermission(Manifest.permission.CAMERA)==PackageManager.PERMISSION_GRANTED)
            req.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
          else {cameraReq=req;requestPermissions(new String[]{Manifest.permission.CAMERA},CAMERA_REQ);}
        });
      }
      @Override public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> cb,FileChooserParams params){
        if(chooser!=null)chooser.onReceiveValue(null);
        chooser=cb;
        try{startActivityForResult(params.createIntent(),CHOOSER_REQ);return true;}
        catch(Exception e){chooser=null;cb.onReceiveValue(null);return false;}
      }
    });
    setContentView(web);
    web.loadUrl("https://appassets.androidplatform.net/assets/index.html?android=1");
  }
  @Override public void onRequestPermissionsResult(int c,String[] perms,int[] results){
    super.onRequestPermissionsResult(c,perms,results);
    if(c!=CAMERA_REQ||cameraReq==null)return;
    PermissionRequest req=cameraReq;cameraReq=null;
    if(results.length>0&&results[0]==PackageManager.PERMISSION_GRANTED)
      req.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
    else req.deny();
  }
  @Override protected void onActivityResult(int code,int result,Intent data){
    super.onActivityResult(code,result,data);
    if(code!=CHOOSER_REQ||chooser==null)return;
    chooser.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result,data));
    chooser=null;
  }
  @Override public void onBackPressed(){
    if(web!=null)web.evaluateJavascript("if(typeof osBack==='function'){osBack();}else if(typeof goHome==='function'){goHome();}",null);
    else super.onBackPressed();
  }
  private void immersive(){
    getWindow().getDecorView().setSystemUiVisibility(
      View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|
      View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY|View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN|
      View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
  }
  @Override public void onWindowFocusChanged(boolean focus){super.onWindowFocusChanged(focus);if(focus)immersive();}
  @Override public void onDestroy(){
    if(cameraReq!=null)cameraReq.deny();
    if(chooser!=null)chooser.onReceiveValue(null);
    if(web!=null){web.destroy();web=null;}
    super.onDestroy();
  }
}
