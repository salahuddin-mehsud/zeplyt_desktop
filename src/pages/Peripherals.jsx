import { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import * as receiptPrinter from '../utils/receiptPrinter';
const { generateReceiptPreviewLines, renderPreviewHTML } = receiptPrinter;

const Peripherals = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // --- Browser print toggle ---
  const [useBrowserPrint, setUseBrowserPrint] = useState(() => {
  return localStorage.getItem('useBrowserPrint') === 'true';
});
  const printMode = useBrowserPrint ? 'browser' : 'ethernet';

  const [settingsMode, setSettingsMode] = useState(() => {
  return localStorage.getItem('settingsMode') || 'ethernet';
});
const currentModeLabel = settingsMode === 'browser' ? 'Browser' : 'Ethernet';

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

  // --- TAB STATE ---
  const [tab, setTab] = useState('setup');

  // ===== Load from localStorage =====
  const loadLocalData = async () => {
    setLoading(true);
    try {
      const savedEthernet = JSON.parse(localStorage.getItem('ethernetPrinters') || '[]');
      setEthernetPrinters(savedEthernet);
    } catch (err) {
      console.error('Failed to load local printer data:', err);
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

  useEffect(() => {
    loadLocalData();
  }, []);

  // ===== Receipt settings =====
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
    }
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
  };

  const fetchReceiptSettings = async (type, mode) => {
  try {
    const res = await api.get(`/pos/receipt-settings/${type}?mode=${mode}`);
    return res.data;
  } catch (err) {
    console.error(`Failed to fetch ${type} settings:`, err);
    return getDefaultReceiptSettings(type);
  }
};

  useEffect(() => {
  const loadAll = async () => {
    setLoadingSettings(true);
    const bill = await fetchReceiptSettings('bill', settingsMode);
    const kitchen = await fetchReceiptSettings('kitchen', settingsMode);
    setBillSettings(bill);
    setKitchenSettings(kitchen);
    setLoadingSettings(false);
  };
  loadAll();
}, [settingsMode]);

  // ===== Ethernet handlers =====
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

  // ===== Receipt settings handlers =====
  const handleSaveReceiptSettings = async (type, data) => {
  setSavingSettings(true);
  try {
    const res = await api.put(`/pos/receipt-settings/${type}`, { ...data, mode: settingsMode });
    if (type === 'bill') setBillSettings(res.data);
    else setKitchenSettings(res.data);
    alert(`${type.charAt(0).toUpperCase()+type.slice(1)} settings saved for ${settingsMode} mode!`);
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

  // ===== Preview component =====
  const ReceiptPreview = ({ formData, type }) => {
    const CHAR_WIDTH = 48;
    const lines = generateReceiptPreviewLines(SAMPLE_ORDER, type, formData, CHAR_WIDTH);
    const html = renderPreviewHTML(lines, formData.fontMultiplier || 1);
    return (
      <div className="sticky top-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Live Preview</label>
          <span className="text-[9px] text-gray-400 italic">Matches thermal printer output</span>
        </div>
        <div className="bg-gray-100 border border-gray-200 rounded-xl p-4 flex justify-center">
          <div
  className="bg-white shadow-md"
  style={{
    width: '80mm',           // exact thermal paper width
    padding: '0',            // no extra padding – matches printer
    fontFamily: '"Courier New", Courier, monospace',
    fontSize: '11px',
    lineHeight: '1.25',
    color: '#000',
    boxSizing: 'border-box',
    overflow: 'hidden',
  }}
  dangerouslySetInnerHTML={{ __html: html }}
/>
        </div>
      </div>
    );
  };

  // ===== Receipt settings form (unchanged) =====
  const ReceiptSettingsForm = ({ settings, type, currentMode, onSave, onLogoUpload, onRemoveLogo, uploadingLogo, savingSettings }) => {
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
  <div className="mt-1.5 grid grid-cols-2 md:grid-cols-7 gap-1.5 p-1.5 bg-gray-100 rounded">
    {/* Align */}
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
    {/* Bold */}
    <label className="flex items-center gap-1 text-xs text-gray-700">
      <input
        type="checkbox"
        checked={lineObj.bold || false}
        onChange={(e) => handleLineChange(field, idx, 'bold', e.target.checked)}
      />
      Bold
    </label>
    {/* Double Ht */}
    <label className="flex items-center gap-1 text-xs text-gray-700">
      <input
        type="checkbox"
        checked={lineObj.doubleHeight || false}
        onChange={(e) => handleLineChange(field, idx, 'doubleHeight', e.target.checked)}
      />
      Double Ht
    </label>
    {/* Divider Below */}
    <label className="flex items-center gap-1 text-xs text-gray-700">
      <input
        type="checkbox"
        checked={lineObj.dividerBelow || false}
        onChange={(e) => handleLineChange(field, idx, 'dividerBelow', e.target.checked)}
      />
      Divider Below
    </label>

    {/* Font Size (multiplier) */}
    <div>
      <label className="block text-[8px] font-bold uppercase tracking-wider text-gray-500">Font Size</label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={lineObj.fontSize || 1}
          onChange={(e) => handleLineChange(field, idx, 'fontSize', parseFloat(e.target.value) || 1)}
          min="0.5"
          max="3"
          step="0.1"
          className="w-10 bg-white border border-gray-200 rounded px-1 py-0.5 text-xs text-gray-800 text-center"
        />
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => {
              const val = (lineObj.fontSize || 1) + 0.1;
              handleLineChange(field, idx, 'fontSize', Math.min(val, 3));
            }}
            className="text-[8px] leading-none text-blue-600 hover:text-blue-800"
          >▲</button>
          <button
            type="button"
            onClick={() => {
              const val = (lineObj.fontSize || 1) - 0.1;
              handleLineChange(field, idx, 'fontSize', Math.max(val, 0.5));
            }}
            className="text-[8px] leading-none text-blue-600 hover:text-blue-800"
          >▼</button>
        </div>
      </div>
    </div>

    {/* Padding Top (mm) */}
    <div>
      <label className="block text-[8px] font-bold uppercase tracking-wider text-gray-500">Padding Top</label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={lineObj.paddingTop || 0}
          onChange={(e) => handleLineChange(field, idx, 'paddingTop', parseFloat(e.target.value) || 0)}
          min="0"
          max="5"
          step="0.5"
          className="w-10 bg-white border border-gray-200 rounded px-1 py-0.5 text-xs text-gray-800 text-center"
        />
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => {
              const val = (lineObj.paddingTop || 0) + 0.5;
              handleLineChange(field, idx, 'paddingTop', Math.min(val, 5));
            }}
            className="text-[8px] leading-none text-blue-600 hover:text-blue-800"
          >▲</button>
          <button
            type="button"
            onClick={() => {
              const val = (lineObj.paddingTop || 0) - 0.5;
              handleLineChange(field, idx, 'paddingTop', Math.max(val, 0));
            }}
            className="text-[8px] leading-none text-blue-600 hover:text-blue-800"
          >▼</button>
        </div>
      </div>
    </div>

    {/* 🆕 Padding Bottom (mm) */}
    <div>
      <label className="block text-[8px] font-bold uppercase tracking-wider text-gray-500">Padding Bottom</label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={lineObj.paddingBottom || 0}
          onChange={(e) => handleLineChange(field, idx, 'paddingBottom', parseFloat(e.target.value) || 0)}
          min="0"
          max="5"
          step="0.5"
          className="w-10 bg-white border border-gray-200 rounded px-1 py-0.5 text-xs text-gray-800 text-center"
        />
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => {
              const val = (lineObj.paddingBottom || 0) + 0.5;
              handleLineChange(field, idx, 'paddingBottom', Math.min(val, 5));
            }}
            className="text-[8px] leading-none text-blue-600 hover:text-blue-800"
          >▲</button>
          <button
            type="button"
            onClick={() => {
              const val = (lineObj.paddingBottom || 0) - 0.5;
              handleLineChange(field, idx, 'paddingBottom', Math.max(val, 0));
            }}
            className="text-[8px] leading-none text-blue-600 hover:text-blue-800"
          >▼</button>
        </div>
      </div>
    </div>
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

        <div className="flex gap-3 items-center mt-4 flex-wrap">
          <div className="flex gap-3 items-center mt-4 flex-wrap">
  <button
    type="submit"
    disabled={savingSettings}
    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded text-xs font-bold transition-colors disabled:opacity-50"
  >
    {savingSettings ? 'Saving...' : `💾 Save ${currentMode} Settings`}
  </button>
</div>
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
      {/* Tabs */}
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

      {tab === 'setup' && (
        <div className="space-y-6">
          {/* Browser Print Toggle */}
          <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
            <h2 className="text-[10px] uppercase tracking-wider font-bold mb-3 text-gray-500">
              Browser Print Mode
            </h2>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={useBrowserPrint}
                onChange={(e) => {
                  const val = e.target.checked;
                  setUseBrowserPrint(val);
                  localStorage.setItem('useBrowserPrint', String(val));
                }}
                className="w-8 h-4 rounded-full bg-gray-300 checked:bg-blue-600 transition-colors appearance-none cursor-pointer relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-3 after:h-3 after:bg-white after:rounded-full after:shadow after:transition-transform checked:after:translate-x-4"
              />
              <span className="text-sm font-medium text-gray-700">
                {useBrowserPrint ? '🖨️ Browser Print (USB/Network)' : '🔇 Silent Print (Ethernet/Bluetooth)'}
              </span>
            </label>
            <p className="text-[10px] text-gray-400 mt-2">
              {useBrowserPrint
                ? 'When enabled, KOT and Bill prints will open the Windows print dialog, allowing you to select any printer.'
                : 'When disabled, printing will be silent via Ethernet/Bluetooth as configured below.'}
            </p>
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
        </div>
      )}

      {tab === 'customize' && (
        <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
          <h2 className="text-xs uppercase tracking-wider font-bold text-gray-500 mb-3">
  Receipt Customization – <span className="text-blue-600">Mode: {currentModeLabel}</span>
</h2>

<div className="flex items-center gap-4 mb-4">
  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Settings Mode:</span>
  <button
    onClick={() => {
      setSettingsMode('ethernet');
      localStorage.setItem('settingsMode', 'ethernet');
    }}
    className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
      settingsMode === 'ethernet'
        ? 'bg-gray-700 text-white'
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }`}
  >
    Ethernet
  </button>
  <button
    onClick={() => {
      setSettingsMode('browser');
      localStorage.setItem('settingsMode', 'browser');
    }}
    className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
      settingsMode === 'browser'
        ? 'bg-blue-600 text-white'
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }`}
  >
    Browser
  </button>
  <span className="text-[10px] text-gray-400 ml-auto">
    Current: <span className="font-bold text-blue-600">{currentModeLabel}</span>
  </span>
</div>

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
  currentMode={currentModeLabel}
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