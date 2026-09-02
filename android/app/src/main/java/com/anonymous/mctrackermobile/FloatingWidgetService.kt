package com.anonymous.mctrackermobile

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.IBinder
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageView
import androidx.core.app.NotificationCompat
import kotlin.math.hypot

class FloatingWidgetService : Service() {

    private var windowManager: WindowManager? = null
    private var floatingView: View? = null
    private var params: WindowManager.LayoutParams? = null

    private var initialX = 0
    private var initialY = 0
    private var initialTouchX = 0f
    private var initialTouchY = 0f

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    override fun onCreate() {
        super.onCreate()

        // Create notification channel for Foreground Service on Android O+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channelId = "mc_tracker_live_overlay"
            val channelName = "MC Tracker Live Overlay"
            val channel = NotificationChannel(
                channelId,
                channelName,
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)

            val notification: Notification = NotificationCompat.Builder(this, channelId)
                .setContentTitle("MC Tracker Live Overlay")
                .setContentText("Floating action button is active")
                .setSmallIcon(android.R.drawable.ic_input_add)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build()

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(1001, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
            } else {
                startForeground(1001, notification)
            }
        }

        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager

        // Create the container layout for the floating button
        val sizeInDp = 56
        val density = resources.displayMetrics.density
        val sizeInPx = (sizeInDp * density).toInt()

        val frameLayout = FrameLayout(this)
        
        // Background shape (#03ad03 green circle with shadow)
        val drawable = GradientDrawable()
        drawable.shape = GradientDrawable.OVAL
        drawable.setColor(Color.parseColor("#03ad03"))
        frameLayout.background = drawable
        frameLayout.elevation = 16f

        // White + Icon in center
        val iconView = ImageView(this)
        iconView.setImageResource(android.R.drawable.ic_input_add)
        iconView.setColorFilter(Color.WHITE)
        
        val iconSizePx = (28 * density).toInt()
        val iconParams = FrameLayout.LayoutParams(iconSizePx, iconSizePx)
        iconParams.gravity = Gravity.CENTER
        frameLayout.addView(iconView, iconParams)

        floatingView = frameLayout

        // WindowManager parameters for drawing over all apps
        val layoutType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        params = WindowManager.LayoutParams(
            sizeInPx,
            sizeInPx,
            layoutType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        )

        params?.gravity = Gravity.TOP or Gravity.START
        params?.x = (resources.displayMetrics.widthPixels - sizeInPx - (20 * density).toInt())
        params?.y = (resources.displayMetrics.heightPixels - sizeInPx - (120 * density).toInt())

        windowManager?.addView(floatingView, params)

        // Attach touch and drag listener
        floatingView?.setOnTouchListener(object : View.OnTouchListener {
            override fun onTouch(v: View?, event: MotionEvent?): Boolean {
                if (event == null || params == null) return false

                when (event.action) {
                    MotionEvent.ACTION_DOWN -> {
                        initialX = params!!.x
                        initialY = params!!.y
                        initialTouchX = event.rawX
                        initialTouchY = event.rawY
                        return true
                    }
                    MotionEvent.ACTION_MOVE -> {
                        params!!.x = initialX + (event.rawX - initialTouchX).toInt()
                        params!!.y = initialY + (event.rawY - initialTouchY).toInt()
                        windowManager?.updateViewLayout(floatingView, params)
                        return true
                    }
                    MotionEvent.ACTION_UP -> {
                        val diffX = event.rawX - initialTouchX
                        val diffY = event.rawY - initialTouchY
                        
                        // If tap (movement < 10px), open MC Tracker app and request Quick Add Modal!
                        if (hypot(diffX.toDouble(), diffY.toDouble()) < 10) {
                            val launchIntent = Intent(this@FloatingWidgetService, MainActivity::class.java)
                            launchIntent.putExtra("OPEN_QUICK_ADD", true)
                            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                            startActivity(launchIntent)
                        }
                        return true
                    }
                }
                return false
            }
        })
    }

    override fun onDestroy() {
        super.onDestroy()
        if (floatingView != null && windowManager != null) {
            windowManager?.removeView(floatingView)
        }
    }
}
