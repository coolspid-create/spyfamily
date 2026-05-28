package com.coolspid.familyxscheduler;

import android.graphics.Color;
import android.os.Bundle;
import android.view.Window;

import androidx.activity.EdgeToEdge;
import androidx.core.graphics.Insets;
import androidx.core.view.WindowInsetsControllerCompat;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        supportRequestWindowFeature(Window.FEATURE_NO_TITLE);

        // Enable Edge-to-Edge display (required for SDK 35+ / Android 15)
        EdgeToEdge.enable(this);

        super.onCreate(savedInstanceState);

        if (getSupportActionBar() != null) {
            getSupportActionBar().hide();
        }

        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat insetsController =
                new WindowInsetsControllerCompat(getWindow(), getWindow().getDecorView());
        insetsController.setAppearanceLightStatusBars(false);
        insetsController.setAppearanceLightNavigationBars(false);

        // Apply window insets so content is not obscured by system bars
        ViewCompat.setOnApplyWindowInsetsListener(
            findViewById(android.R.id.content),
            (view, windowInsets) -> {
                Insets insets = windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars()
                );
                view.setBackgroundColor(Color.rgb(0x1A, 0x23, 0x7E));
                view.setPadding(
                    insets.left,
                    insets.top,
                    insets.right,
                    insets.bottom
                );
                return WindowInsetsCompat.CONSUMED;
            }
        );
        ViewCompat.requestApplyInsets(findViewById(android.R.id.content));
    }
}
