package com.larifita.cubana;

import android.net.Uri;
import android.os.Bundle;
import androidx.browser.customtabs.CustomTabsIntent;
import com.google.androidbrowserhelper.trusted.LauncherActivity;

public class MainActivity extends LauncherActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    protected void launch(CustomTabsIntent customTabsIntent) {
        // Aquí forzamos tu URL real
        customTabsIntent.launchUrl(this, Uri.parse("https://larifitacubanaoficial.abrdns.com"));
    }
}
