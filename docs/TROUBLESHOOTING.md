# SENTINEL Troubleshooting & Diagnostics Guide

---

## 1. ESP32 Microcontroller Issues

### Symptom: ESP32 fails to connect to Wi-Fi
- **Check 2.4 GHz vs 5 GHz**: The ESP32 hardware radio only supports **2.4 GHz Wi-Fi** bands. If your home/college router has dual-band with band-steering, ensure the 2.4 GHz SSID is selected.
- **Check Serial Monitor**: Open Arduino IDE Serial Monitor at `115200` baud. Inspect the boot messages to verify the assigned IP address.
- **Static IP Recommendation**: For presentation stability, consider assigning a static IP in your router's DHCP reservation list.

### Symptom: MQ-2 sensor ADC reading is stuck at 0 or 4095
- **Check Pin Wiring**: Ensure `AOUT` (not DOUT) is wired to `GPIO 34`.
- **Heater Warm-up**: The MQ-2 requires 5V on VCC to heat its internal SnO2 coil. If wired to a 3.3V pin, the heater will not reach operating temperature.

---

## 2. Local Wi-Fi Mobile Phone Access

### Symptom: Phone cannot open `http://<laptop-ip>:5173`
1. **Find Laptop IPv4**:
   Open PowerShell and run:
   ```powershell
   ipconfig
   ```
   Look for `Wireless LAN adapter Wi-Fi` -> `IPv4 Address` (e.g. `192.168.1.100`).
2. **Verify Both on Same Wi-Fi**:
   Ensure both your phone and laptop are connected to the same Wi-Fi router (and not on isolated guest networks).
3. **Windows Firewall Rule**:
   If Windows Firewall blocks port 5173 or 8000, allow Node and Python or run:
   ```powershell
   New-NetFirewallRule -DisplayName "SENTINEL Frontend" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow
   New-NetFirewallRule -DisplayName "SENTINEL Backend" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
   ```

---

## 3. Backend & SQLite

### Symptom: `ModuleNotFoundError: No module named 'app'`
Ensure the command is run from the workspace root with `PYTHONPATH="backend"`:
```powershell
$env:PYTHONPATH="backend"
.\backend\.venv\Scripts\python.exe backend\run.py
```
