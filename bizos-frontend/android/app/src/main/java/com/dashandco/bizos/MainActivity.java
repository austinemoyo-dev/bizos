package com.dashandco.bizos;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(NativePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
