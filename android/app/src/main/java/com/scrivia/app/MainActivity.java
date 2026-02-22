package com.scrivia.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(OpenInBrowserPlugin.class);
        // AppPlugin est auto-enregistré par Capacitor v8 via @capacitor/app — pas besoin de registerPlugin
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        Uri data = intent.getData();
        if (data != null) {
            String url = data.toString();
            if (url.startsWith("scrivia://")) {
                // Injecte l'URL directement dans le JS, sans dépendre du bridge Capacitor.
                // Si le handler JS est prêt → appelé immédiatement.
                // Sinon → stocké dans __scriviaDeepLinkPending, consommé au prochain démarrage du hook.
                String safeUrl = url.replace("\\", "\\\\").replace("'", "\\'");
                String js = "(function(){ var fn = window.__scriviaDeepLink;"
                          + " if (typeof fn === 'function') { fn('" + safeUrl + "'); }"
                          + " else { window.__scriviaDeepLinkPending = '" + safeUrl + "'; } })();";
                getBridge().getWebView().post(() ->
                    getBridge().getWebView().evaluateJavascript(js, null)
                );
            }
        }
    }
}
