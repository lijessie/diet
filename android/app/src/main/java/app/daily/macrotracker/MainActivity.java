package app.daily.macrotracker;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DailyBackupPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
