package com.dashandco.bizos;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.view.View;
import android.widget.RemoteViews;

/**
 * Feature 4 — Home Screen Widget.
 * Displays available balance, active repair count, and a pending-sync dot.
 * Data is written to SharedPreferences by NativePlugin (from JS) and read here.
 */
public class BizOSWidget extends AppWidgetProvider {

    static void updateWidget(Context ctx, AppWidgetManager mgr, int widgetId) {
        SharedPreferences prefs = ctx.getSharedPreferences(
                NativePlugin.PREFS_WIDGET, Context.MODE_PRIVATE);

        String balance    = prefs.getString("balance",   "₦0.00");
        String repairs    = prefs.getString("repairs",   "0 jobs");
        boolean hasPending = prefs.getBoolean("hasPending", false);

        RemoteViews views = new RemoteViews(ctx.getPackageName(), R.layout.widget_bizos);
        views.setTextViewText(R.id.widget_balance, balance);
        views.setTextViewText(R.id.widget_repairs, repairs);
        views.setViewVisibility(R.id.widget_sync_dot,
                hasPending ? View.VISIBLE : View.GONE);

        // Tap the widget → open dashboard via deep link
        Intent intent = new Intent(ctx, MainActivity.class);
        intent.setData(Uri.parse("bizos://business/dashboard"));
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(
                ctx, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_root, pi);

        mgr.updateAppWidget(widgetId, views);
    }

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] widgetIds) {
        for (int id : widgetIds) updateWidget(ctx, mgr, id);
    }
}
