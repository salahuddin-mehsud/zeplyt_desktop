import { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import * as receiptPrinter from '../utils/receiptPrinter';
const { generateReceiptPreviewLines, renderPreviewHTML } = receiptPrinter;


const Peripherals = () => {
  const [systemPrinters, setSystemPrinters] = useState([]);
  const [defaultPrinter, setDefaultPrinter] = useState('');
  const [bluetoothPort, setBluetoothPort] = useState('');
  const [availablePorts, setAvailablePorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingPort, setTestingPort] = useState(null);
  const [manualPort, setManualPort] = useState('');
  const [manualDeviceName, setManualDeviceName] = useState('');
  const [bluetoothPrinterName, setBluetoothPrinterName] = useState('');
  const [manualWindowsPrinter, setManualWindowsPrinter] = useState('');

  // --- Receipt settings state ---
  const [activeReceiptTab, setActiveReceiptTab] = useState('bill');
  const [billSettings, setBillSettings] = useState(null);
  const [kitchenSettings, setKitchenSettings] = useState(null);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // --- Ethernet printer state ---
  const [ethernetPrinters, setEthernetPrinters] = useState([]);
  const [newEthernet, setNewEthernet] = useState({ name: '', ipAddress: '', port: '9100', role: 'Receipt' });
  const [loadingEthernet, setLoadingEthernet] = useState(false);

  // --- Bluetooth edit state ---
  const [editingBluetooth, setEditingBluetooth] = useState(false);
  const [editBluetoothPort, setEditBluetoothPort] = useState('');
  const [editBluetoothName, setEditBluetoothName] = useState('');

  // --- Print text size (for Bluetooth) ---
  const [fontScale, setFontScale] = useState(() => localStorage.getItem('printerScale') || '2');

  // --- TAB STATE ---
  const [tab, setTab] = useState('setup'); // 'setup' or 'customize'

  // ===== HELPER: Load data from localStorage + IPC =====
  // ===== HELPER: Load data from localStorage + IPC =====
const loadLocalData = async () => {
  setLoading(true);
  try {
    // 1. Load from localStorage
    const savedDefaultPrinter = localStorage.getItem('defaultPrinter') || '';
    const savedBluetoothPort = localStorage.getItem('bluetoothPort') || '';
    const savedBluetoothName = localStorage.getItem('bluetoothPrinterName') || '';
    const savedEthernet = JSON.parse(localStorage.getItem('ethernetPrinters') || '[]');

    setDefaultPrinter(savedDefaultPrinter);
    setBluetoothPort(savedBluetoothPort);
    setBluetoothPrinterName(savedBluetoothName);
    setEthernetPrinters(savedEthernet);

    // 2. Check if running in Electron
    const isElectron = typeof window.require === 'function';
    if (isElectron) {
      const { ipcRenderer } = window.require('electron');
      const printers = await ipcRenderer.invoke('get-system-printers');
      setSystemPrinters(printers || []);
      const ports = await ipcRenderer.invoke('get-bluetooth-ports');
      setAvailablePorts(ports || []);
    } else {
      // Fallback to server API (for browser dev mode)
      console.warn('Electron IPC not available; falling back to server API.');
      const [systemPrintersRes, portsRes] = await Promise.all([
        api.get('/pos/system-printers'),
        api.get('/pos/bluetooth-ports')
      ]);
      setSystemPrinters(systemPrintersRes.data.printers || []);
      setAvailablePorts(portsRes.data.ports || []);
    }
  } catch (err) {
    console.error('Failed to load local printer data:', err);
    alert('Failed to load printer data.');
  } finally {
    setLoading(false);
  }
};


const SAMPLE_ORDER = {
  tokenNo: 42,
  orderNo: '1024',
  type: 'Dine In',
  table: { name: 'T-5' },
  customerName: 'John Doe',
  createdAt: new Date().toISOString(),
  instructions: 'Extra spicy, no onions',
  items: [
    { name: 'Chicken Karahi', qty: 2, price: 5.5 },
    { name: 'Garlic Naan', qty: 3, price: 0.75 },
    { name: 'Mint Raita', qty: 1, price: 1.25 },
  ],
  subTotal: 15.5,
  taxAmount: 1.55,
  discountAmount: 0,
  finalAmount: 17.05,
};

  // ===== LOAD on mount =====
  useEffect(() => {
    loadLocalData();
  }, []);

 // ===== RECEIPT SETTINGS (server) =====
const getDefaultReceiptSettings = (type) => {
  if (type === 'bill') {
    return {
      logoUrl: '',
      logoWidth: 192,
      headerLines: [{ text: '*** ZEPLYT ***', alignment: 'center', bold: true, doubleHeight: true, dividerBelow: true }],
      footerLines: [{ text: 'Thank you!', alignment: 'center' }],
      itemBlock: { alignment: 'left', bold: false, doubleHeight: false },
      showDivider: true,
      showTax: true,
      showSubtotal: true,
      showTotal: true,
      showCustomerName: true,
      showTable: true,
      showDateTime: true,
      showToken: true,
      showOrderNo: false,
      globalAlignment: 'left',
      globalBold: false,
      globalDoubleHeight: false,
      itemFormat: '{name}  {qty} x {price} = {total}',
      itemColumns: [
        { key: 'sr', label: 'Sr.', width: 0, align: 'left', visible: true },
        { key: 'name', label: 'Item', width: 0, align: 'left', visible: true },
        { key: 'qty', label: 'Qty', width: 0, align: 'right', visible: true },
        { key: 'price', label: 'Price', width: 0, align: 'right', visible: true },
        { key: 'amount', label: 'Amt', width: 0, align: 'right', visible: true }
      ],
      totalsFormat: 'Subtotal: {subtotal}\nTax: {tax}\nTotal: {total}',
      decimalPlaces: 3,
      fontMultiplier: 1,
      sectionMargin: 1
    };
  } else {
    return {
      logoUrl: '',
      logoWidth: 192,
      headerLines: [{ text: '*** KITCHEN TICKET ***', alignment: 'center', bold: true, doubleHeight: true, dividerBelow: true }],
      footerLines: [{ text: 'Please prepare', alignment: 'center' }],
      itemBlock: { alignment: 'left', bold: false, doubleHeight: false },
      showDivider: true,
      showTax: false,
      showSubtotal: false,
      showTotal: false,
      showCustomerName: true,
      showTable: true,
      showDateTime: true,
      showToken: true,
      showOrderNo: false,
      globalAlignment: 'left',
      globalBold: false,
      globalDoubleHeight: false,
      itemFormat: '{name}  {qty}',
      itemColumns: [
        { key: 'sr', label: 'Sr.', width: 0, align: 'left', visible: true },
        { key: 'name', label: 'Item', width: 0, align: 'left', visible: true },
        { key: 'qty', label: 'Qty', width: 0, align: 'right', visible: true }
      ],
      totalsFormat: '',
      decimalPlaces: 0,
      fontMultiplier: 1,
      sectionMargin: 1
    };
  }
};

const fetchReceiptSettings = async (type) => {
  try {
    const res = await api.get(`/pos/receipt-settings/${type}`);
    return res.data;
  } catch (err) {
    console.error(`Failed to fetch ${type} settings:`, err);
    // Fallback to default settings
    return getDefaultReceiptSettings(type);
  }
};

  useEffect(() => {
    const loadAll = async () => {
      setLoadingSettings(true);
      const bill = await fetchReceiptSettings('bill');
      const kitchen = await fetchReceiptSettings('kitchen');
      setBillSettings(bill);
      setKitchenSettings(kitchen);
      setLoadingSettings(false);
    };
    loadAll();
  }, []);

  // ===== PRINTER HANDLERS (local storage) =====

  const handleAddEthernet = (e) => {
    e.preventDefault();
    if (!newEthernet.name || !newEthernet.ipAddress) {
      return alert('Name and IP are required');
    }
    setLoadingEthernet(true);
    try {
      const newPrinter = {
        id: Date.now().toString(),
        ...newEthernet,
        connectionType: 'tcp',
        port: parseInt(newEthernet.port) || 9100,
      };
      const updated = [...ethernetPrinters, newPrinter];
      localStorage.setItem('ethernetPrinters', JSON.stringify(updated));
      setEthernetPrinters(updated);
      setNewEthernet({ name: '', ipAddress: '', port: '9100', role: 'Receipt' });
      alert('Ethernet printer added locally.');
    } catch (err) {
      alert('Failed to add Ethernet printer.');
    } finally {
      setLoadingEthernet(false);
    }
  };

  const handleDeleteEthernet = (id) => {
    if (!confirm('Remove this Ethernet printer?')) return;
    try {
      const updated = ethernetPrinters.filter(p => p.id !== id);
      localStorage.setItem('ethernetPrinters', JSON.stringify(updated));
      setEthernetPrinters(updated);
    } catch (err) {
      alert('Failed to delete printer.');
    }
  };

  const handleSetDefaultPrinter = (printerName) => {
    setSaving(true);
    try {
      if (printerName) {
        localStorage.setItem('defaultPrinter', printerName);
        setDefaultPrinter(printerName);
        alert(`✅ Windows default printer set to "${printerName}".`);
      } else {
        localStorage.removeItem('defaultPrinter');
        setDefaultPrinter('');
        alert(`✅ Windows default printer cleared.`);
      }
    } catch (err) {
      alert('Failed to save default printer.');
    } finally {
      setSaving(false);
    }
  };

  const handleSetBluetoothPrinter = (comPort, deviceName = '') => {
    if (!comPort) return alert('Please select a COM port.');
    setSaving(true);
    try {
      if (comPort) {
        localStorage.setItem('bluetoothPort', comPort);
        localStorage.setItem('bluetoothPrinterName', deviceName || comPort);
        setBluetoothPort(comPort);
        setBluetoothPrinterName(deviceName || comPort);
        alert(`✅ Bluetooth printer "${deviceName || comPort}" set to ${comPort}.`);
      } else {
        localStorage.removeItem('bluetoothPort');
        localStorage.removeItem('bluetoothPrinterName');
        setBluetoothPort('');
        setBluetoothPrinterName('');
      }
    } catch (err) {
      alert('Failed to save Bluetooth printer.');
    } finally {
      setSaving(false);
    }
  };

  const testComPort = async (comPort) => {
  const isElectron = typeof window.require === 'function';
  if (!isElectron) {
    alert('Testing COM port is only available in Electron app.');
    return;
  }
  setTestingPort(comPort);
  try {
    const { ipcRenderer } = window.require('electron');
    const result = await ipcRenderer.invoke('test-bluetooth-port', comPort);
    if (result.success) {
      alert(`✅ ${comPort} is working! You can now save it.`);
    } else {
      alert(`❌ ${comPort} not responding. Make sure printer is paired and powered on. Error: ${result.error || 'Unknown'}`);
    }
  } catch (err) {
    alert(`❌ Test failed for ${comPort}.`);
  } finally {
    setTestingPort(null);
  }
};


  const updatePrinterScale = (scale) => {
    try {
      localStorage.setItem('printerScale', scale);
      setFontScale(scale);
      alert(`Text scale set to ${scale}x.`);
    } catch (err) {
      alert('Failed to save scale');
    }
  };

  const openBluetoothSettings = () => {
    window.open('ms-settings:bluetooth');
  };

  // ===== RECEIPT SETTINGS HANDLERS (unchanged) =====
  const handleSaveReceiptSettings = async (type, data) => {
    setSavingSettings(true);
    try {
      const res = await api.put(`/pos/receipt-settings/${type}`, data);
      if (type === 'bill') setBillSettings(res.data);
      else setKitchenSettings(res.data);
      alert(`${type.charAt(0).toUpperCase()+type.slice(1)} settings saved!`);
    } catch (err) {
      alert('Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleLogoUpload = async (type, file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('logo', file);
    formData.append('type', type);
    setUploadingLogo(true);
    try {
      const res = await api.post('/pos/receipt-settings/upload-logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (type === 'bill') {
        setBillSettings(prev => ({ ...prev, logoUrl: res.data.logoUrl }));
      } else {
        setKitchenSettings(prev => ({ ...prev, logoUrl: res.data.logoUrl }));
      }
      alert('Logo uploaded successfully!');
    } catch (err) {
      alert('Logo upload failed');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async (type) => {
    if (!confirm('Remove the logo for this receipt type?')) return;
    try {
      const updateData = { logoUrl: '' };
      const res = await api.put(`/pos/receipt-settings/${type}`, updateData);
      if (type === 'bill') setBillSettings(res.data);
      else setKitchenSettings(res.data);
      alert('Logo removed successfully.');
    } catch (err) {
      alert('Failed to remove logo.');
    }
  };


  const ReceiptPreview = ({ formData, type }) => {
  const CHAR_WIDTH = 42; // typical 80mm thermal printer at normal font (adjust if your printer uses a different char count)
  const lines = generateReceiptPreviewLines(SAMPLE_ORDER, type, formData, CHAR_WIDTH);
  const html = renderPreviewHTML(lines, formData.fontMultiplier || 1);

  return (
    <div className="sticky top-4">
      <div className="flex items-center justify-between mb-2">
        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
          Live Preview
        </label>
        <span className="text-[9px] text-gray-400 italic">Matches thermal printer output</span>
      </div>
      <div className="bg-gray-100 border border-gray-200 rounded-xl p-4 flex justify-center">
        <div
          className="bg-white shadow-md"
          style={{
            width: '300px',
            padding: '10px 8px',
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '11px',
            lineHeight: '1.25',
            color: '#000',
          }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
};

  // ===== RECEIPT CUSTOMIZATION FORM (unchanged) =====
  const ReceiptSettingsForm = ({ settings, type, onSave, onLogoUpload, onRemoveLogo, uploadingLogo, savingSettings }) => {
    const [formData, setFormData] = useState(settings);
    const [expandedLines, setExpandedLines] = useState({});
    const [importing, setImporting] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
      setFormData(settings);
    }, [settings]);

    const toggleExpand = (field, index) => {
      const key = `${field}-${index}`;
      setExpandedLines(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleLineChange = (field, index, prop, value) => {
      const newArray = [...formData[field]];
      newArray[index] = { ...newArray[index], [prop]: value };
      setFormData(prev => ({ ...prev, [field]: newArray }));
    };

    const addLine = (field) => {
      setFormData(prev => ({
        ...prev,
        [field]: [...prev[field], { text: '', alignment: null, bold: false, doubleHeight: false, dividerBelow: false }]
      }));
    };

    const removeLine = (field, index) => {
      const newArray = [...formData[field]];
      newArray.splice(index, 1);
      setFormData(prev => ({ ...prev, [field]: newArray }));
    };

    const handleNestedChange = (path, value) => {
      const keys = path.split('.');
      setFormData(prev => {
        const newData = { ...prev };
        let current = newData;
        for (let i = 0; i < keys.length - 1; i++) {
          current = current[keys[i]] = { ...current[keys[i]] };
        }
        current[keys[keys.length - 1]] = value;
        return newData;
      });
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      onSave(type, formData);
    };

    const handleLogoChange = (e) => {
      const file = e.target.files[0];
      if (file) {
        onLogoUpload(type, file);
      }
    };

    const handleExport = async () => {
      try {
        const res = await api.get(`/pos/receipt-settings/${type}/export`);
        const data = res.data;
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `receipt-settings-${type}-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        alert('Failed to export settings');
      }
    };

    const handleImportClick = () => {
      fileInputRef.current.click();
    };

    const handleImportFile = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      setImporting(true);
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const res = await api.post(`/pos/receipt-settings/${type}/import`, data);
        onSave(type, res.data);
        alert('Settings imported successfully!');
      } catch (err) {
        alert('Failed to import settings: ' + (err.response?.data?.message || err.message));
      } finally {
        setImporting(false);
        fileInputRef.current.value = '';
      }
    };

    const renderLine = (field, lineObj, idx) => {
      const key = `${field}-${idx}`;
      const isExpanded = expandedLines[key] || false;

      return (
        <div key={idx} className="border border-gray-200 rounded p-1.5 mb-1.5 bg-gray-50">
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={lineObj.text || ''}
              onChange={(e) => handleLineChange(field, idx, 'text', e.target.value)}
              className="flex-1 bg-white border border-gray-200 rounded px-2.5 py-1 text-xs text-gray-800"
              placeholder="Line text"
            />
            <button
              type="button"
              onClick={() => toggleExpand(field, idx)}
              className="text-blue-600 hover:text-blue-800 text-xs"
            >
              ✎ Edit
            </button>
            <button
              type="button"
              onClick={() => removeLine(field, idx)}
              className="text-red-500 hover:text-red-700 text-xs"
            >
              ✕
            </button>
          </div>

          {isExpanded && (
            <div className="mt-1.5 grid grid-cols-2 md:grid-cols-4 gap-1.5 p-1.5 bg-gray-100 rounded">
              <div>
                <label className="block text-[8px] font-bold uppercase tracking-wider text-gray-500">Align</label>
                <select
                  value={lineObj.alignment || ''}
                  onChange={(e) => handleLineChange(field, idx, 'alignment', e.target.value || null)}
                  className="w-full bg-white border border-gray-200 rounded px-1.5 py-0.5 text-xs text-gray-800"
                >
                  <option value="">Global</option>
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
              <label className="flex items-center gap-1 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={lineObj.bold || false}
                  onChange={(e) => handleLineChange(field, idx, 'bold', e.target.checked)}
                />
                Bold
              </label>
              <label className="flex items-center gap-1 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={lineObj.doubleHeight || false}
                  onChange={(e) => handleLineChange(field, idx, 'doubleHeight', e.target.checked)}
                />
                Double Ht
              </label>
              <label className="flex items-center gap-1 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={lineObj.dividerBelow || false}
                  onChange={(e) => handleLineChange(field, idx, 'dividerBelow', e.target.checked)}
                />
                Divider Below
              </label>
            </div>
          )}
        </div>
      );
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6">

          <form onSubmit={handleSubmit} className="space-y-4 flex-1 min-w-0">

        {/* Logo upload */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Logo</label>
          <div className="flex items-center gap-3 flex-wrap">
            {formData.logoUrl && (
              <>
                <img src={formData.logoUrl} alt="Logo" className="h-10 object-contain" />
                <button
                  type="button"
                  onClick={() => onRemoveLogo(type)}
                  className="text-red-500 text-xs underline hover:text-red-700"
                >
                  Remove Logo
                </button>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              disabled={uploadingLogo}
              className="bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5 text-xs text-gray-800"
            />
            {uploadingLogo && <span className="text-xs text-gray-400">Uploading...</span>}
          </div>
        </div>

        {/* Logo Width */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
            Logo Width (px) – must be multiple of 8
          </label>
          <input
            type="number"
            name="logoWidth"
            value={formData.logoWidth || 192}
            onChange={(e) => setFormData(prev => ({ ...prev, logoWidth: parseInt(e.target.value) || 192 }))}
            min="64"
            max="384"
            step="8"
            className="w-28 bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5 text-xs text-gray-800"
          />
          <span className="text-[10px] text-gray-400 ml-2">(default: 192)</span>
        </div>

        {/* Header Lines */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">Header Lines</label>
            <button type="button" onClick={() => addLine('headerLines')} className="text-blue-600 text-xs underline">+ Add</button>
          </div>
          {formData.headerLines.map((lineObj, idx) => renderLine('headerLines', lineObj, idx))}
        </div>

        {/* Footer Lines */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">Footer Lines</label>
            <button type="button" onClick={() => addLine('footerLines')} className="text-blue-600 text-xs underline">+ Add</button>
          </div>
          {formData.footerLines.map((lineObj, idx) => renderLine('footerLines', lineObj, idx))}
        </div>

        {/* Items Block Settings */}
        <div className="border-t border-gray-200 pt-3 mt-3">
          <h3 className="text-xs font-bold mb-2 text-gray-500">Items Block Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-0.5">Alignment</label>
              <select
                value={formData.itemBlock?.alignment || ''}
                onChange={(e) => handleNestedChange('itemBlock.alignment', e.target.value || null)}
                className="bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5 text-xs text-gray-800 w-full"
              >
                <option value="">Global</option>
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>
            <label className="flex items-center gap-1.5 text-xs text-gray-700">
              <input
                type="checkbox"
                checked={formData.itemBlock?.bold || false}
                onChange={(e) => handleNestedChange('itemBlock.bold', e.target.checked)}
              />
              Bold Items
            </label>
            <label className="flex items-center gap-1.5 text-xs text-gray-700">
              <input
                type="checkbox"
                checked={formData.itemBlock?.doubleHeight || false}
                onChange={(e) => handleNestedChange('itemBlock.doubleHeight', e.target.checked)}
              />
              Double Height Items
            </label>
          </div>
        </div>

        {/* Global toggles */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <label className="flex items-center gap-1.5 text-xs text-gray-700">
            <input type="checkbox" name="showDivider" checked={formData.showDivider} onChange={(e) => setFormData(prev => ({ ...prev, showDivider: e.target.checked }))} />
            Show Divider
          </label>
          <label className="flex items-center gap-1.5 text-xs text-gray-700">
            <input type="checkbox" name="showTax" checked={formData.showTax} onChange={(e) => setFormData(prev => ({ ...prev, showTax: e.target.checked }))} />
            Show Tax
          </label>
          <label className="flex items-center gap-1.5 text-xs text-gray-700">
            <input type="checkbox" name="showSubtotal" checked={formData.showSubtotal} onChange={(e) => setFormData(prev => ({ ...prev, showSubtotal: e.target.checked }))} />
            Show Subtotal
          </label>
          <label className="flex items-center gap-1.5 text-xs text-gray-700">
            <input type="checkbox" name="showTotal" checked={formData.showTotal !== undefined ? formData.showTotal : true} onChange={(e) => setFormData(prev => ({ ...prev, showTotal: e.target.checked }))} />
            Show Total
          </label>
          <label className="flex items-center gap-1.5 text-xs text-gray-700">
            <input type="checkbox" name="showCustomerName" checked={formData.showCustomerName} onChange={(e) => setFormData(prev => ({ ...prev, showCustomerName: e.target.checked }))} />
            Show Customer Name
          </label>
          <label className="flex items-center gap-1.5 text-xs text-gray-700">
            <input type="checkbox" name="showTable" checked={formData.showTable} onChange={(e) => setFormData(prev => ({ ...prev, showTable: e.target.checked }))} />
            Show Table
          </label>
          <label className="flex items-center gap-1.5 text-xs text-gray-700">
            <input type="checkbox" name="showDateTime" checked={formData.showDateTime} onChange={(e) => setFormData(prev => ({ ...prev, showDateTime: e.target.checked }))} />
            Show Date/Time
          </label>
          <label className="flex items-center gap-1.5 text-xs text-gray-700">
            <input type="checkbox" name="showToken" checked={formData.showToken} onChange={(e) => setFormData(prev => ({ ...prev, showToken: e.target.checked }))} />
            Show Token
          </label>
          <label className="flex items-center gap-1.5 text-xs text-gray-700">
            <input type="checkbox" name="showOrderNo" checked={formData.showOrderNo} onChange={(e) => setFormData(prev => ({ ...prev, showOrderNo: e.target.checked }))} />
            Show Order No
          </label>
        </div>

        {/* Global alignment, bold, double-height */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-0.5">Global Alignment</label>
            <select
              name="globalAlignment"
              value={formData.globalAlignment || 'left'}
              onChange={(e) => setFormData(prev => ({ ...prev, globalAlignment: e.target.value }))}
              className="bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5 text-xs text-gray-800 w-full"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
          <label className="flex items-center gap-1.5 text-xs text-gray-700">
            <input
              type="checkbox"
              name="globalBold"
              checked={formData.globalBold || false}
              onChange={(e) => setFormData(prev => ({ ...prev, globalBold: e.target.checked }))}
            />
            Global Bold
          </label>
          <label className="flex items-center gap-1.5 text-xs text-gray-700">
            <input
              type="checkbox"
              name="globalDoubleHeight"
              checked={formData.globalDoubleHeight || false}
              onChange={(e) => setFormData(prev => ({ ...prev, globalDoubleHeight: e.target.checked }))}
            />
            Global Double Height
          </label>
        </div>

        {/* Item Format */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Item Format</label>
          <input
            type="text"
            name="itemFormat"
            value={formData.itemFormat}
            onChange={(e) => setFormData(prev => ({ ...prev, itemFormat: e.target.value }))}
            placeholder='{name}  {qty} x {price} = {total}'
            className="w-full bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5 text-xs text-gray-800"
          />
          <p className="text-[10px] text-gray-400 mt-0.5">Available placeholders: {`{name} {qty} {price} {total}`}</p>
        </div>

        {/* Item Columns Configuration */}
        <div className="border-t border-gray-200 pt-3 mt-3">
          <h3 className="text-xs font-bold mb-1 text-gray-500">Item Table Columns</h3>
          <p className="text-[10px] text-gray-400 mb-2">Toggle visibility and adjust column order</p>
          <div className="space-y-1.5">
            {formData.itemColumns ? (
              formData.itemColumns.map((col, idx) => (
                <div key={col.key} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded p-1.5">
                  <input
                    type="checkbox"
                    checked={col.visible !== false}
                    onChange={(e) => {
                      const newCols = [...formData.itemColumns];
                      newCols[idx].visible = e.target.checked;
                      setFormData(prev => ({ ...prev, itemColumns: newCols }));
                    }}
                    className="accent-blue-500"
                  />
                  <span className="text-xs font-mono w-16 text-gray-700">{col.label}</span>
                  <select
                    value={col.align || 'left'}
                    onChange={(e) => {
                      const newCols = [...formData.itemColumns];
                      newCols[idx].align = e.target.value;
                      setFormData(prev => ({ ...prev, itemColumns: newCols }));
                    }}
                    className="bg-white border border-gray-200 rounded px-1 py-0.5 text-[10px] text-gray-800"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                  <input
                    type="number"
                    value={col.width || 0}
                    onChange={(e) => {
                      const newCols = [...formData.itemColumns];
                      newCols[idx].width = parseInt(e.target.value) || 0;
                      setFormData(prev => ({ ...prev, itemColumns: newCols }));
                    }}
                    placeholder="Width"
                    className="w-14 bg-white border border-gray-200 rounded px-1 py-0.5 text-[10px] text-gray-800"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newCols = [...formData.itemColumns];
                      const item = newCols.splice(idx, 1)[0];
                      if (idx > 0) {
                        newCols.splice(idx - 1, 0, item);
                        setFormData(prev => ({ ...prev, itemColumns: newCols }));
                      }
                    }}
                    className="text-blue-600 text-xs disabled:opacity-30"
                    disabled={idx === 0}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const newCols = [...formData.itemColumns];
                      const item = newCols.splice(idx, 1)[0];
                      if (idx < newCols.length) {
                        newCols.splice(idx + 1, 0, item);
                        setFormData(prev => ({ ...prev, itemColumns: newCols }));
                      }
                    }}
                    className="text-blue-600 text-xs disabled:opacity-30"
                    disabled={idx === formData.itemColumns.length - 1}
                  >
                    ↓
                  </button>
                  <span className="text-[10px] text-gray-400">{col.key}</span>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-xs">Loading columns...</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              const defaultCols = [
                { key: 'sr', label: 'Sr.', width: 0, align: 'left', visible: true },
                { key: 'name', label: 'Item', width: 0, align: 'left', visible: true },
                { key: 'qty', label: 'Qty', width: 0, align: 'right', visible: true },
                { key: 'price', label: 'Price', width: 0, align: 'right', visible: true },
                { key: 'amount', label: 'Amt', width: 0, align: 'right', visible: true }
              ];
              setFormData(prev => ({ ...prev, itemColumns: defaultCols }));
            }}
            className="text-blue-600 text-xs underline mt-1.5"
          >
            Reset to Default Columns
          </button>
        </div>

        {/* Totals Format */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Totals Format</label>
          <textarea
            name="totalsFormat"
            value={formData.totalsFormat || 'Subtotal: {subtotal}\nTax (10%): {tax}\nTotal: {total}'}
            onChange={(e) => setFormData(prev => ({ ...prev, totalsFormat: e.target.value }))}
            placeholder='Subtotal: {subtotal}\nTax (10%): {tax}\nTotal: {total}'
            rows="3"
            className="w-full bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5 text-xs font-mono text-gray-800"
          />
          <p className="text-[10px] text-gray-400 mt-0.5">Use lines separated by \n. Placeholders: {`{subtotal} {tax} {total}`}</p>
        </div>

        {/* Decimal Places */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Decimal Places</label>
          <select
            name="decimalPlaces"
            value={formData.decimalPlaces !== undefined ? formData.decimalPlaces : 3}
            onChange={(e) => setFormData(prev => ({ ...prev, decimalPlaces: parseInt(e.target.value) }))}
            className="bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5 text-xs text-gray-800"
          >
            <option value="0">0 (whole numbers)</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
          </select>
        </div>

        {/* Font Multiplier */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
            Font Multiplier (0.1 – 4.0)
          </label>
          <input
            type="number"
            name="fontMultiplier"
            value={formData.fontMultiplier !== undefined ? formData.fontMultiplier : 1}
            onChange={(e) => setFormData(prev => ({ ...prev, fontMultiplier: parseFloat(e.target.value) || 1 }))}
            min="0.1"
            max="4"
            step="0.1"
            className="w-20 bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5 text-xs text-gray-800"
          />
          <span className="text-[10px] text-gray-400 ml-2">(0.1 = tiny, 1 = normal, 4 = largest)</span>
        </div>

        {/* Section Spacing */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
            Section Spacing (blank lines)
          </label>
          <input
            type="number"
            name="sectionMargin"
            value={formData.sectionMargin !== undefined ? formData.sectionMargin : 1}
            onChange={(e) => setFormData(prev => ({ ...prev, sectionMargin: parseInt(e.target.value) || 0 }))}
            min="0"
            max="5"
            className="w-16 bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5 text-xs text-gray-800"
          />
          <span className="text-[10px] text-gray-400 ml-2">(0–5 lines between sections)</span>
        </div>

        <div className="flex gap-3 items-center mt-4">
          <button
            type="submit"
            disabled={savingSettings}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded text-xs font-bold transition-colors disabled:opacity-50"
          >
            {savingSettings ? 'Saving...' : 'Save Settings'}
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="bg-green-100 text-green-700 border border-green-200 px-3 py-1.5 rounded text-xs font-bold hover:bg-green-600 hover:text-white transition-colors"
          >
            📤 Export
          </button>
          <button
            type="button"
            onClick={handleImportClick}
            disabled={importing}
            className="bg-amber-100 text-amber-700 border border-amber-200 px-3 py-1.5 rounded text-xs font-bold hover:bg-amber-600 hover:text-white transition-colors disabled:opacity-50"
          >
            {importing ? 'Importing...' : '📥 Import'}
          </button>
          <input
            type="file"
            accept=".json"
            ref={fileInputRef}
            onChange={handleImportFile}
            className="hidden"
          />
        </div>
      </form>
       <div className="lg:w-[340px] shrink-0">
      <ReceiptPreview formData={formData} type={type} />
    </div>
  </div>
    );
  };

  // ===== RENDER =====
  if (loading) return <div className="p-6 text-gray-400 text-xs text-center">Loading peripherals...</div>;

  return (
    <div className="p-4 md:p-6 text-gray-800 font-sans max-w-6xl mx-auto bg-white min-h-screen">

      {/* ===== TABS ===== */}
      <div className="flex gap-3 border-b border-gray-200 mb-5 pb-2">
        <button
          onClick={() => setTab('setup')}
          className={`px-4 py-1.5 rounded-lg font-bold text-xs transition-colors ${
            tab === 'setup' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700'
          }`}
        >
          🖨️ Setup Printer
        </button>
        <button
          onClick={() => setTab('customize')}
          className={`px-4 py-1.5 rounded-lg font-bold text-xs transition-colors ${
            tab === 'customize' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700'
          }`}
        >
          ✏️ Customize Receipt
        </button>
      </div>

      {/* ===== SETUP PRINTER TAB ===== */}
      {tab === 'setup' && (
        <div className="space-y-6">
          {/* Windows Printers Section */}
          <div className="bg-white border border-gray-200 p-2 rounded-lg shadow-sm">
            <h2 className="text-[9px] uppercase tracking-wider font-bold mb-1.5 text-gray-500">
              Windows Printers (Browser Print)
            </h2>
            <div className="mb-2">
              <div className="flex justify-between items-center mb-1">
                <label className="text-[9px] font-bold text-gray-500">Detected Printers</label>
                <button onClick={loadLocalData} className="text-blue-600 text-[9px] underline">Refresh</button>
              </div>
              {systemPrinters.length === 0 ? (
                <p className="text-[10px] text-gray-400">No Windows printers found.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                  {systemPrinters.map(printer => (
                    <div key={printer} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-1.5">
                      <div>
                        <div className="font-medium text-xs text-gray-800">{printer}</div>
                        {defaultPrinter === printer && (
                          <span className="text-[9px] text-green-600">✓ Default</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleSetDefaultPrinter(printer)}
                        disabled={saving || defaultPrinter === printer}
                        className={`px-2 py-0.5 rounded text-[9px] font-bold transition ${
                          defaultPrinter === printer
                            ? 'bg-green-100 text-green-700 cursor-default border border-green-200'
                            : 'bg-blue-600 hover:bg-blue-500 text-white'
                        }`}
                      >
                        {defaultPrinter === printer ? 'Default' : 'Set as Default'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="border-t border-gray-200 pt-2 mt-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <div className="flex-1 min-w-[140px]">
                  <input
                    type="text"
                    placeholder="Enter printer name manually"
                    value={manualWindowsPrinter}
                    onChange={(e) => setManualWindowsPrinter(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-0.5 text-[10px] text-gray-800 focus:border-blue-400 outline-none"
                  />
                </div>
                <button
                  onClick={() => {
                    if (manualWindowsPrinter) {
                      handleSetDefaultPrinter(manualWindowsPrinter);
                    } else {
                      alert('Enter a printer name');
                    }
                  }}
                  disabled={!manualWindowsPrinter || saving}
                  className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[9px] font-bold"
                >
                  Add / Set Default
                </button>
                {defaultPrinter && (
                  <button
                    onClick={async () => {
                      if (confirm('Clear default Windows printer? Orders will no longer open browser print.')) {
                        handleSetDefaultPrinter('');
                        setManualWindowsPrinter('');
                      }
                    }}
                    className="px-2 py-0.5 bg-red-100 text-red-600 border border-red-200 rounded text-[9px] font-bold hover:bg-red-200"
                  >
                    Clear Default
                  </button>
                )}
              </div>
              <p className="text-[9px] text-gray-400 mt-1">
                If your printer does not appear in the list, type its exact name (e.g., "POS-80-Series") and click "Add".
              </p>
            </div>
            <p className="text-[9px] text-gray-400 mt-1.5">
              When a Windows default printer is set, orders will also show the browser print dialog (user can select printer).
            </p>
          </div>

          {/* Bluetooth Printers Section */}
          <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
            <h2 className="text-[10px] uppercase tracking-wider font-bold mb-3 text-gray-500">
              Bluetooth Receipt Printer (Silent ESC/POS)
            </h2>

            {bluetoothPort && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                {!editingBluetooth ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-green-700 text-sm">✓ Active Bluetooth Printer</div>
                      <div className="text-gray-800 font-medium text-sm">{bluetoothPrinterName || bluetoothPort}</div>
                      <div className="text-[10px] text-gray-400">{bluetoothPort}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditBluetoothPort(bluetoothPort);
                          setEditBluetoothName(bluetoothPrinterName || '');
                          setEditingBluetooth(true);
                        }}
                        className="text-blue-600 text-xs underline hover:text-blue-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Clear saved Bluetooth printer?')) {
                            localStorage.removeItem('bluetoothPort');
                            localStorage.removeItem('bluetoothPrinterName');
                            setBluetoothPort('');
                            setBluetoothPrinterName('');
                          }
                        }}
                        className="text-red-500 text-xs underline hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Device name"
                        value={editBluetoothName}
                        onChange={(e) => setEditBluetoothName(e.target.value)}
                        className="flex-1 bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5 text-xs text-gray-800"
                      />
                      <input
                        type="text"
                        placeholder="COM port"
                        value={editBluetoothPort}
                        onChange={(e) => setEditBluetoothPort(e.target.value.toUpperCase())}
                        className="w-20 bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5 text-xs font-mono text-gray-800"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (!editBluetoothPort) return alert('COM port required');
                          setSaving(true);
                          try {
                            localStorage.setItem('bluetoothPort', editBluetoothPort);
                            localStorage.setItem('bluetoothPrinterName', editBluetoothName || editBluetoothPort);
                            setBluetoothPort(editBluetoothPort);
                            setBluetoothPrinterName(editBluetoothName || editBluetoothPort);
                            setEditingBluetooth(false);
                            alert('Bluetooth printer updated.');
                          } catch (err) {
                            alert('Update failed');
                          } finally {
                            setSaving(false);
                          }
                        }}
                        disabled={saving}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-bold"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingBluetooth(false)}
                        className="px-2.5 py-1 bg-gray-200 text-gray-700 rounded text-[10px]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-bold text-gray-700">Paired Bluetooth Printers (auto-detected)</h3>
                <button onClick={loadLocalData} className="text-blue-600 text-[10px] underline">Refresh Ports</button>
              </div>
              {availablePorts.length === 0 ? (
                <p className="text-gray-400 text-xs">No paired Bluetooth printers detected. Pair a printer first.</p>
              ) : (
                <div className="space-y-1.5">
                  {availablePorts.map(item => (
                    <div key={item.comPort} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-2.5">
                      <div>
                        <div className="font-medium text-sm text-gray-800">{item.deviceName}</div>
                        <div className="text-[10px] text-gray-400">{item.comPort}</div>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => testComPort(item.comPort)}
                          disabled={testingPort === item.comPort}
                          className="px-2.5 py-1 rounded text-[10px] bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
                        >
                          {testingPort === item.comPort ? 'Testing...' : 'Test'}
                        </button>
                        <button
                          onClick={() => handleSetBluetoothPrinter(item.comPort, item.deviceName)}
                          disabled={saving || bluetoothPort === item.comPort}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                            bluetoothPort === item.comPort ? 'bg-green-100 text-green-700 border border-green-200 cursor-default' : 'bg-blue-600 hover:bg-blue-500 text-white'
                          }`}
                        >
                          {bluetoothPort === item.comPort ? 'Active' : 'Use'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="border-t border-gray-200 pt-4 mt-2">
              <p className="text-xs text-gray-600 mb-1.5">Or add a printer manually (if not detected):</p>
              <div className="flex gap-1.5 mb-1.5">
                <input
                  type="text"
                  placeholder="Device name (e.g., KOT Printer)"
                  value={manualDeviceName}
                  onChange={(e) => setManualDeviceName(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:border-blue-400 outline-none flex-1"
                />
                <input
                  type="text"
                  placeholder="COM port (e.g., COM8)"
                  value={manualPort}
                  onChange={(e) => setManualPort(e.target.value.toUpperCase())}
                  className="bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:border-blue-400 outline-none w-24"
                />
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => manualPort && testComPort(manualPort)}
                  disabled={!manualPort || testingPort === manualPort}
                  className="px-2.5 py-1.5 bg-gray-200 text-gray-700 rounded text-[10px] hover:bg-gray-300 disabled:opacity-50"
                >
                  Test
                </button>
                <button
                  onClick={() => handleSetBluetoothPrinter(manualPort, manualDeviceName || `Manual: ${manualPort}`)}
                  disabled={!manualPort || saving}
                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-bold"
                >
                  Save
                </button>
              </div>
            </div>
          </div>

          {/* Ethernet Printers Section */}
          <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
            <h2 className="text-[10px] uppercase tracking-wider font-bold mb-3 text-gray-500">
              Ethernet Receipt Printers (Network TCP/IP)
            </h2>
            {ethernetPrinters.length === 0 ? (
              <p className="text-xs text-gray-400 mb-3">No Ethernet printers configured.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                {ethernetPrinters.map(printer => (
                  <div key={printer.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-2.5">
                    <div>
                      <div className="font-medium text-sm text-gray-800">{printer.name}</div>
                      <div className="text-[10px] text-gray-400">{printer.ipAddress}:{printer.port} · {printer.role}</div>
                    </div>
                    <button
                      onClick={() => handleDeleteEthernet(printer.id)}
                      className="text-red-500 text-[10px] underline hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={handleAddEthernet} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
              <div>
                <label className="block text-[8px] font-bold uppercase tracking-wider text-gray-500 mb-1">Printer Name</label>
                <input
                  type="text"
                  placeholder="e.g., Front Desk"
                  value={newEthernet.name}
                  onChange={e => setNewEthernet({ ...newEthernet, name: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5 outline-none focus:border-blue-400 text-xs text-gray-800"
                  required
                />
              </div>
              <div>
                <label className="block text-[8px] font-bold uppercase tracking-wider text-gray-500 mb-1">IP Address</label>
                <input
                  type="text"
                  placeholder="192.168.1.100"
                  value={newEthernet.ipAddress}
                  onChange={e => setNewEthernet({ ...newEthernet, ipAddress: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5 outline-none focus:border-blue-400 text-xs text-gray-800"
                  required
                />
              </div>
              <div>
                <label className="block text-[8px] font-bold uppercase tracking-wider text-gray-500 mb-1">Port</label>
                <input
                  type="number"
                  placeholder="9100"
                  value={newEthernet.port}
                  onChange={e => setNewEthernet({ ...newEthernet, port: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5 outline-none focus:border-blue-400 text-xs text-gray-800"
                />
              </div>
              <div>
                <label className="block text-[8px] font-bold uppercase tracking-wider text-gray-500 mb-1">Role</label>
                <select
                  value={newEthernet.role}
                  onChange={e => setNewEthernet({ ...newEthernet, role: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5 outline-none focus:border-blue-400 text-xs text-gray-800"
                >
                  <option value="Receipt">Receipt (Customer)</option>
                  <option value="Kitchen">Kitchen (KOT)</option>
                  <option value="Label">Label</option>
                </select>
              </div>
              <div>
                <button
                  type="submit"
                  disabled={loadingEthernet}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-1.5 rounded text-xs transition-colors"
                >
                  {loadingEthernet ? 'Adding...' : 'Add Ethernet Printer'}
                </button>
              </div>
            </form>
            <p className="text-[10px] text-gray-400 mt-2">
              Ethernet printers print <strong>silently</strong> (no browser popup) over your LAN. Make sure the printer is connected to your network and has a static IP.
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
            💡 <strong>How it works:</strong>
            <ul className="list-disc list-inside mt-1.5 space-y-0.5">
              <li>If a Bluetooth printer is set, orders will print silently via server.</li>
              <li>If a Windows printer is set, the browser print dialog will appear (user can select printer).</li>
              <li>If both are set, <strong>both will print</strong> (silent + popup).</li>
            </ul>
          </div>
        </div>
      )}

      {/* ===== CUSTOMIZE RECEIPT TAB ===== */}
      {tab === 'customize' && (
        <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
          <h2 className="text-[10px] uppercase tracking-wider font-bold mb-3 text-gray-500">
            Receipt Customization
          </h2>

          {/* Tabs for Bill/Kitchen */}
          <div className="flex border-b border-gray-200 mb-4">
            <button
              onClick={() => setActiveReceiptTab('bill')}
              className={`py-1.5 px-3 font-bold text-xs transition-colors ${activeReceiptTab === 'bill' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Customer Bill
            </button>
            <button
              onClick={() => setActiveReceiptTab('kitchen')}
              className={`py-1.5 px-3 font-bold text-xs transition-colors ${activeReceiptTab === 'kitchen' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Kitchen Ticket (KOT)
            </button>
          </div>

          {loadingSettings ? (
            <p className="text-gray-400 text-xs">Loading settings...</p>
          ) : (
            (activeReceiptTab === 'bill' ? billSettings : kitchenSettings) && (
              <ReceiptSettingsForm
                settings={activeReceiptTab === 'bill' ? billSettings : kitchenSettings}
                type={activeReceiptTab}
                onSave={handleSaveReceiptSettings}
                onLogoUpload={handleLogoUpload}
                uploadingLogo={uploadingLogo}
                onRemoveLogo={handleRemoveLogo}
                savingSettings={savingSettings}
              />
            )
          )}
        </div>
      )}
    </div>
  );
};

export default Peripherals;