package ai.asius.connect;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(BluetoothNativePlugin.class);
    super.onCreate(savedInstanceState);
  }
}
