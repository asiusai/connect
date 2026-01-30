package ai.asius.connect;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothGatt;
import android.bluetooth.BluetoothGattCallback;
import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattDescriptor;
import android.bluetooth.BluetoothGattService;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothProfile;
import android.bluetooth.le.BluetoothLeScanner;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanFilter;
import android.bluetooth.le.ScanResult;
import android.bluetooth.le.ScanSettings;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.ParcelUuid;
import androidx.core.app.ActivityCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.json.JSONObject;

@CapacitorPlugin(
  name = "BluetoothNative",
  permissions = {
    @Permission(strings = { Manifest.permission.BLUETOOTH_SCAN }, alias = "bluetooth_scan"),
    @Permission(strings = { Manifest.permission.BLUETOOTH_CONNECT }, alias = "bluetooth_connect"),
    @Permission(strings = { Manifest.permission.ACCESS_FINE_LOCATION }, alias = "location")
  }
)
public class BluetoothNativePlugin extends Plugin {

  private static final UUID SERVICE_UUID = UUID.fromString("a51a5a10-0001-4c0d-b8e6-a51a5a100001");
  private static final UUID REQUEST_CHAR_UUID = UUID.fromString("a51a5a10-0002-4c0d-b8e6-a51a5a100001");
  private static final UUID RESPONSE_CHAR_UUID = UUID.fromString("a51a5a10-0003-4c0d-b8e6-a51a5a100001");
  private static final UUID CCCD_UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb");

  private BluetoothAdapter bluetoothAdapter;
  private BluetoothLeScanner bluetoothLeScanner;
  private BluetoothGatt bluetoothGatt;
  private BluetoothGattCharacteristic requestChar;
  private BluetoothGattCharacteristic responseChar;
  private String responseBuffer = "";
  private int requestId = 0;
  private PluginCall pendingCall;
  private String connectionStatus = "disconnected";

  @Override
  public void load() {
    BluetoothManager bluetoothManager = (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
    bluetoothAdapter = bluetoothManager.getAdapter();
    if (bluetoothAdapter != null) {
      bluetoothLeScanner = bluetoothAdapter.getBluetoothLeScanner();
    }
  }

  @PluginMethod
  public void startScan(PluginCall call) {
    if (!hasRequiredPermissions()) {
      requestAllPermissions(call, "scanPermissionsCallback");
      return;
    }

    if (bluetoothLeScanner == null) {
      call.reject("Bluetooth not available");
      return;
    }

    ScanFilter filter = new ScanFilter.Builder().setServiceUuid(new ParcelUuid(SERVICE_UUID)).build();

    List<ScanFilter> filters = new ArrayList<>();
    filters.add(filter);

    ScanSettings settings = new ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build();

    try {
      bluetoothLeScanner.startScan(filters, settings, scanCallback);
      call.resolve();
    } catch (SecurityException e) {
      call.reject("Permission denied", e);
    }
  }

  @PluginMethod
  public void scanPermissionsCallback(PluginCall call) {
    if (hasRequiredPermissions()) {
      startScan(call);
    } else {
      call.reject("Permissions required");
    }
  }

  @PluginMethod
  public void stopScan(PluginCall call) {
    if (bluetoothLeScanner != null) {
      try {
        bluetoothLeScanner.stopScan(scanCallback);
      } catch (SecurityException ignored) {}
    }
    call.resolve();
  }

  @PluginMethod
  public void connect(PluginCall call) {
    String address = call.getString("address");
    if (address == null) {
      call.reject("Address required");
      return;
    }

    if (!hasRequiredPermissions()) {
      requestAllPermissions(call, "connectPermissionsCallback");
      return;
    }

    try {
      BluetoothDevice device = bluetoothAdapter.getRemoteDevice(address);
      connectionStatus = "connecting";
      notifyStatusChange();
      bluetoothGatt = device.connectGatt(getContext(), false, gattCallback);
      call.resolve();
    } catch (Exception e) {
      call.reject("Connection failed", e);
    }
  }

  @PluginMethod
  public void connectPermissionsCallback(PluginCall call) {
    if (hasRequiredPermissions()) {
      connect(call);
    } else {
      call.reject("Permissions required");
    }
  }

  @PluginMethod
  public void disconnect(PluginCall call) {
    if (bluetoothGatt != null) {
      try {
        bluetoothGatt.disconnect();
        bluetoothGatt.close();
      } catch (SecurityException ignored) {}
      bluetoothGatt = null;
    }
    connectionStatus = "disconnected";
    notifyStatusChange();
    call.resolve();
  }

  @PluginMethod
  public void getConnectionStatus(PluginCall call) {
    JSObject ret = new JSObject();
    ret.put("status", connectionStatus);
    call.resolve(ret);
  }

  @PluginMethod
  public void call(PluginCall call) {
    if (requestChar == null) {
      call.reject("Not connected");
      return;
    }

    String method = call.getString("method");
    JSObject params = call.getObject("params");

    requestId++;

    try {
      JSONObject request = new JSONObject();
      request.put("jsonrpc", "2.0");
      request.put("method", method);
      request.put("params", params != null ? new JSONObject(params.toString()) : JSONObject.NULL);
      request.put("id", requestId);

      String json = request.toString();
      byte[] data = json.getBytes(StandardCharsets.UTF_8);

      pendingCall = call;
      responseBuffer = "";

      // Write in chunks (MTU = 512)
      int MTU = 512;
      for (int i = 0; i < data.length; i += MTU) {
        int end = Math.min(i + MTU, data.length);
        byte[] chunk = new byte[end - i];
        System.arraycopy(data, i, chunk, 0, chunk.length);
        requestChar.setValue(chunk);
        bluetoothGatt.writeCharacteristic(requestChar);
      }
    } catch (Exception e) {
      call.reject("Call failed", e);
    }
  }

  private final ScanCallback scanCallback = new ScanCallback() {
    @Override
    public void onScanResult(int callbackType, ScanResult result) {
      BluetoothDevice device = result.getDevice();
      JSObject deviceObj = new JSObject();
      try {
        deviceObj.put("address", device.getAddress());
        String name = device.getName();
        if (name != null) {
          deviceObj.put("name", name);
        }
        deviceObj.put("rssi", result.getRssi());
        notifyListeners("deviceFound", deviceObj);
      } catch (SecurityException ignored) {}
    }
  };

  private final BluetoothGattCallback gattCallback = new BluetoothGattCallback() {
    @Override
    public void onConnectionStateChange(BluetoothGatt gatt, int status, int newState) {
      if (newState == BluetoothProfile.STATE_CONNECTED) {
        connectionStatus = "connected";
        notifyStatusChange();
        try {
          gatt.discoverServices();
        } catch (SecurityException ignored) {}
      } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
        connectionStatus = "disconnected";
        notifyStatusChange();
      }
    }

    @Override
    public void onServicesDiscovered(BluetoothGatt gatt, int status) {
      if (status == BluetoothGatt.GATT_SUCCESS) {
        BluetoothGattService service = gatt.getService(SERVICE_UUID);
        if (service != null) {
          requestChar = service.getCharacteristic(REQUEST_CHAR_UUID);
          responseChar = service.getCharacteristic(RESPONSE_CHAR_UUID);

          if (responseChar != null) {
            try {
              gatt.setCharacteristicNotification(responseChar, true);
              BluetoothGattDescriptor descriptor = responseChar.getDescriptor(CCCD_UUID);
              if (descriptor != null) {
                descriptor.setValue(BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE);
                gatt.writeDescriptor(descriptor);
              }
            } catch (SecurityException ignored) {}
          }
        }
      }
    }

    @Override
    public void onCharacteristicChanged(BluetoothGatt gatt, BluetoothGattCharacteristic characteristic) {
      if (characteristic.getUuid().equals(RESPONSE_CHAR_UUID)) {
        byte[] data = characteristic.getValue();
        String chunk = new String(data, StandardCharsets.UTF_8);
        responseBuffer += chunk;

        try {
          JSONObject response = new JSONObject(responseBuffer);
          responseBuffer = "";

          if (pendingCall != null) {
            JSObject result = new JSObject();
            result.put("result", response.opt("result"));
            pendingCall.resolve(result);
            pendingCall = null;
          }
        } catch (Exception ignored) {
          // Incomplete JSON, wait for more
        }
      }
    }
  };

  private void notifyStatusChange() {
    JSObject ret = new JSObject();
    ret.put("status", connectionStatus);
    notifyListeners("connectionStatusChanged", ret);
  }

  public boolean hasRequiredPermissions() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      return (
        ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_SCAN) ==
        PackageManager.PERMISSION_GRANTED &&
        ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_CONNECT) ==
        PackageManager.PERMISSION_GRANTED
      );
    }
    return (
      ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) ==
      PackageManager.PERMISSION_GRANTED
    );
  }
}
