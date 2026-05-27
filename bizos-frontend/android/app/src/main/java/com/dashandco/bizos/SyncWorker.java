package com.dashandco.bizos;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

/**
 * Feature 18 — Background Sync Worker.
 * Runs every 15 min (when connected). If the JS layer has flagged pending
 * offline mutations (hasPending=true in SharedPreferences), we post a
 * low-priority notification so the user opens the app and triggers the real
 * sync through the Dexie/JS sync queue.
 */
public class SyncWorker extends Worker {

    public SyncWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        SharedPreferences prefs = getApplicationContext()
                .getSharedPreferences(NativePlugin.PREFS_WIDGET, Context.MODE_PRIVATE);
        boolean hasPending = prefs.getBoolean("hasPending", false);

        if (hasPending) postReminderNotification();

        return Result.success();
    }

    private void postReminderNotification() {
        Context ctx = getApplicationContext();
        NotificationManager nm = (NotificationManager)
                ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(
                    "bizos_sync", "Sync Status", NotificationManager.IMPORTANCE_LOW);
            nm.createNotificationChannel(ch);
        }

        Intent intent = new Intent(ctx, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(
                ctx, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder builder =
                new NotificationCompat.Builder(ctx, "bizos_sync")
                        .setSmallIcon(android.R.drawable.ic_popup_sync)
                        .setContentTitle("BizOS — Sync Ready")
                        .setContentText("You have pending changes. Open BizOS to sync.")
                        .setContentIntent(pi)
                        .setAutoCancel(true);

        nm.notify(9002, builder.build());
    }
}
