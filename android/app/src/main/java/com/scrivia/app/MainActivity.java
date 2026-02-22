package com.scrivia.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.capacitorjs.plugins.app.AppPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(OpenInBrowserPlugin.class);
        registerPlugin(AppPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
