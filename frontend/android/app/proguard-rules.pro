# ProGuard / R8 rules for Capacitor Android Application Optimization

# Keep Capacitor v3+ Plugins and Callbacks
-keep @com.getcapacitor.annotation.CapacitorPlugin public class * {
    @com.getcapacitor.annotation.PermissionCallback <methods>;
    @com.getcapacitor.annotation.ActivityCallback <methods>;
    @com.getcapacitor.annotation.Permission <methods>;
    @com.getcapacitor.PluginMethod public <methods>;
}

-keep public class * extends com.getcapacitor.Plugin { *; }

# Keep Legacy Capacitor NativePlugin annotations
-keep @com.getcapacitor.NativePlugin public class * {
    @com.getcapacitor.PluginMethod public <methods>;
}

-keep class com.getcapacitor.** { *; }

# Keep WebView JavaScript Interfaces
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep Cordova plugins if integrated
-keep public class * extends org.apache.cordova.* {
    public <methods>;
    public <fields>;
}

# General attributes for proper reflection & stacktraces
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod,SourceFile,LineNumberTable
