package com.scrivia.app;

import android.content.Intent;
import android.net.Uri;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Ouvre une URL dans le navigateur système (Chrome) via Intent ACTION_VIEW.
 *
 * Deux mécanismes complémentaires :
 *   1. openUrl()          — appelé explicitement depuis JS (via Capacitor bridge)
 *   2. shouldOverrideLoad — intercepte toute navigation WebView vers accounts.google.com
 *                           ou /auth/v1/authorize (Supabase), et la redirige vers Chrome.
 *                           Fonctionne même si le bridge JS→natif échoue.
 */
@CapacitorPlugin(name = "OpenInBrowser")
public class OpenInBrowserPlugin extends Plugin {

    @PluginMethod
    public void openUrl(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("Missing url");
            return;
        }
        openWithSystemBrowser(url);
        call.resolve();
    }

    /**
     * Intercepte la navigation WebView avant qu'elle ne se charge.
     * Retourner true = stopper le WebView + ouvrir dans Chrome.
     * Retourner null = comportement Capacitor par défaut.
     */
    @Override
    public Boolean shouldOverrideLoad(Uri url) {
        String host = url.getHost();
        String path = url.getPath() != null ? url.getPath() : "";

        boolean isGoogleAuth = "accounts.google.com".equals(host);
        boolean isSupabaseAuth = path.startsWith("/auth/v1/authorize");

        if (isGoogleAuth || isSupabaseAuth) {
            openWithSystemBrowser(url.toString());
            return true;
        }
        return null;
    }

    private void openWithSystemBrowser(String url) {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getActivity().startActivity(intent);
    }
}
