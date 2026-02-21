package com.scrivia.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(OpenInBrowserPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
