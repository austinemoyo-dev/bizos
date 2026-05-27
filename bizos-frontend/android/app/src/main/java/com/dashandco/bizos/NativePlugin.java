package com.dashandco.bizos;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.concurrent.TimeUnit;

@CapacitorPlugin(name = "NativePlugin")
public class NativePlugin extends Plugin {

    static final String PREFS_WIDGET = "bizos_widget";
    static final String PREFS_AUTH   = "bizos_auth";
    static final String WORK_TAG     = "bizos_background_sync";

    // ── Feature 4: update home-screen widget data from JS ────────────────────
    @PluginMethod
    public void updateWidgetData(PluginCall call) {
        String balance   = call.getString("balance",  "₦0.00");
        String repairs   = call.getString("repairs",  "0 jobs");
        Boolean pending  = call.getBoolean("hasPending", false);

        SharedPreferences prefs = getContext()
                .getSharedPreferences(PREFS_WIDGET, Context.MODE_PRIVATE);
        prefs.edit()
             .putString("balance",   balance)
             .putString("repairs",   repairs)
             .putBoolean("hasPending", Boolean.TRUE.equals(pending))
             .apply();

        refreshWidget();
        call.resolve();
    }

    // ── Features 5 & 18: flag that unsynced items exist ──────────────────────
    @PluginMethod
    public void setPendingSyncFlag(PluginCall call) {
        Boolean pending = call.getBoolean("pending", false);
        getContext().getSharedPreferences(PREFS_WIDGET, Context.MODE_PRIVATE)
                   .edit()
                   .putBoolean("hasPending", Boolean.TRUE.equals(pending))
                   .apply();
        refreshWidget();
        call.resolve();
    }

    // ── Feature 18: schedule WorkManager periodic sync check ─────────────────
    @PluginMethod
    public void scheduleBackgroundSync(PluginCall call) {
        Constraints constraints = new Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build();

        PeriodicWorkRequest request = new PeriodicWorkRequest.Builder(
                SyncWorker.class, 15, TimeUnit.MINUTES)
                .setConstraints(constraints)
                .build();

        WorkManager.getInstance(getContext())
                   .enqueueUniquePeriodicWork(
                           WORK_TAG,
                           ExistingPeriodicWorkPolicy.KEEP,
                           request);
        call.resolve();
    }

    // ── Feature 1 & 2 helper: persist auth token for WorkManager ─────────────
    @PluginMethod
    public void saveAuthToken(PluginCall call) {
        String token = call.getString("token", null);
        SharedPreferences.Editor editor = getContext()
                .getSharedPreferences(PREFS_AUTH, Context.MODE_PRIVATE)
                .edit();
        if (token != null) {
            editor.putString("access_token", token);
        } else {
            editor.remove("access_token");
        }
        editor.apply();
        call.resolve();
    }

    // ── Feature 5: show / dismiss the persistent sync notification ───────────
    @PluginMethod
    public void showSyncNotification(PluginCall call) {
        int count = call.getInt("count", 0);
        if (count > 0) {
            postSyncNotification(count);
        } else {
            cancelSyncNotification();
        }
        call.resolve();
    }

    // ─────────────────────────────────────────────────────────────────────────

    private void refreshWidget() {
        AppWidgetManager mgr = AppWidgetManager.getInstance(getContext());
        ComponentName cn = new ComponentName(getContext(), BizOSWidget.class);
        int[] ids = mgr.getAppWidgetIds(cn);
        for (int id : ids) {
            BizOSWidget.updateWidget(getContext(), mgr, id);
        }
    }

    private void postSyncNotification(int count) {
        NotificationManager nm = (NotificationManager)
                getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(
                    "bizos_sync", "Sync Status", NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("Pending offline changes");
            nm.createNotificationChannel(ch);
        }

        Intent intent = new Intent(getContext(), MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(
                getContext(), 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(getContext(), "bizos_sync")
                .setSmallIcon(android.R.drawable.ic_popup_sync)
                .setContentTitle("BizOS — Pending Changes")
                .setContentText(count + " change" + (count > 1 ? "s" : "") + " waiting to sync")
                .setContentIntent(pi)
                .setOngoing(true)
                .setAutoCancel(false);

        nm.notify(9001, builder.build());
    }

    private void cancelSyncNotification() {
        NotificationManager nm = (NotificationManager)
                getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.cancel(9001);
    }
}
