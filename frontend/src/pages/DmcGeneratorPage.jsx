import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, Download, Search, Plus, X, ChevronRight, ChevronDown, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Data source options
const DATA_SOURCES = [
  { value: 'general_air_vehicles.json', label: 'General Air Vehicles', description: 'DMC codes for general air vehicles including aircraft, helicopters, and UAVs' },
  { value: 'genral_surface_vehicles.json', label: 'General Surface Vehicles', description: 'DMC codes for land-based vehicles and equipment' },
  { value: 'gsv.json', label: 'General Sea Vehicles', description: 'DMC codes for naval vessels and maritime equipment' },
  { value: 'Maintained SNS - General communications.json', label: 'Maintained SNS - General Communications', description: 'System Numbering System for communication equipment and systems' },
  { value: 'Maintained SNS - Generic.json', label: 'Maintained SNS - Generic', description: 'Generic System Numbering System codes for common equipment' },
  { value: 'maintained_sns_ordanance.json', label: 'Maintained SNS - Ordnance', description: 'System Numbering System for weapons and ordnance systems' },
  { value: 'maintained_sns_support.json', label: 'Maintained SNS - Support', description: 'System Numbering System for support equipment and ground systems' },
];

const ITEM_LOCATION_CODES = [
  { value: 'A', label: 'A - Items on Product' },
  { value: 'B', label: 'B - Items on Major Assembly' },
  { value: 'C', label: 'C - Items on Bench' },
  { value: 'D', label: 'D - All Locations (A, B, C)' },
  { value: 'T', label: 'T - Training Data Module' },
];

// Tree Item Component
const TreeItem = ({ node, level, query, selectedNode, onSelect, expandedNodes, onToggle }) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedNodes.has(node.code + node.level);
  const isSelected = selectedNode?.code === node.code && selectedNode?.level === node.level;

  const highlightText = (text, searchQuery) => {
    if (!searchQuery || !text) return text;
    const regex = new RegExp(`(${searchQuery.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? <mark key={i} className="bg-yellow-200">{part}</mark> : part
    );
  };

  const indent = { group: 0, system: 20, subsystem: 40 };

  return (
    <>
      <div
        className={`flex items-center py-2 px-3 cursor-pointer hover:bg-gray-100 border-b border-gray-100 ${isSelected ? 'bg-blue-100 border-l-4 border-l-blue-500' : ''}`}
        style={{ paddingLeft: `${12 + (indent[level] || 0)}px` }}
        title={node.definition || ''}
        onClick={() => {
          if (hasChildren) {
            onToggle(node);
          } else {
            onSelect(node);
          }
        }}
      >
        <span className="w-5 h-5 flex items-center justify-center mr-2">
          {hasChildren ? (
            isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
          ) : (
            <span className="w-2 h-2 rounded-full bg-gray-400" />
          )}
        </span>
        <span className={`text-sm ${level === 'group' ? 'font-bold text-gray-800' : level === 'system' ? 'font-semibold text-gray-700' : 'text-gray-600'}`}>
          {highlightText(node.label, query)}
        </span>
      </div>
      {isExpanded && hasChildren && node.children.map((child, idx) => (
        <TreeItem
          key={`${child.code}-${idx}`}
          node={child}
          level={child.level}
          query={query}
          selectedNode={selectedNode}
          onSelect={onSelect}
          expandedNodes={expandedNodes}
          onToggle={onToggle}
        />
      ))}
    </>
  );
};

// Info Code Modal Component
const InfoCodeModal = ({ isOpen, onClose, unitNum, allInfoCodes, selectedCodes, onApply }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tempSelected, setTempSelected] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setTempSelected([...selectedCodes]);
      setSearchTerm('');
    }
  }, [isOpen, selectedCodes]);

  const filteredCodes = useMemo(() => {
    if (!searchTerm) return allInfoCodes;
    const lower = searchTerm.toLowerCase();
    return allInfoCodes.filter(item =>
      item.code.toLowerCase().includes(lower) ||
      item.title.toLowerCase().includes(lower) ||
      item.type.toLowerCase().includes(lower)
    );
  }, [allInfoCodes, searchTerm]);

  const toggleCode = (code) => {
    setTempSelected(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Select Info Codes for Unit {String(unitNum).padStart(2, '0')}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
        </div>

        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search info codes..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
            <strong>Selected:</strong> {tempSelected.length > 0 ? tempSelected.join(', ') : 'None'}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredCodes.map(item => {
            const isSelected = tempSelected.includes(item.code);
            return (
              <div
                key={item.code}
                className={`flex items-center gap-3 p-3 border-b cursor-pointer hover:bg-gray-50 ${isSelected ? 'bg-green-50' : ''}`}
                onClick={() => toggleCode(item.code)}
              >
                <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                  {isSelected && <Check size={14} className="text-white" />}
                </div>
                <span className="font-bold text-blue-600 w-12">{item.code}</span>
                <span className="text-gray-500 text-sm w-20">{item.type}</span>
                <span className="flex-1 text-sm">{item.title}</span>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3 p-4 border-t">
          <button
            onClick={() => setTempSelected([])}
            className="flex-1 py-2 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Clear All
          </button>
          <button
            onClick={() => { onApply(tempSelected); onClose(); }}
            className="flex-1 py-2 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

const DmcGeneratorPage = () => {
  const navigate = useNavigate();

  // Form state
  const [dataSource, setDataSource] = useState('');
  const [modelName, setModelName] = useState('');
  const [sdc, setSdc] = useState('');
  const [dmv, setDmv] = useState('');
  const [unitCount, setUnitCount] = useState(0);
  const [infoCodeVariant, setInfoCodeVariant] = useState('A');
  const [itemLocationCode, setItemLocationCode] = useState('D');

  // System hierarchy state
  const [systemData, setSystemData] = useState([]);
  const [systemSearch, setSystemSearch] = useState('');
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [selectedSystem, setSelectedSystem] = useState(null);

  // Info codes state
  const [allInfoCodes, setAllInfoCodes] = useState([]);
  const [globalInfoCode, setGlobalInfoCode] = useState('');
  const [infoCodeSearch, setInfoCodeSearch] = useState('');

  // Per-unit state
  const [dcCodes, setDcCodes] = useState({});
  const [unitInfoCodes, setUnitInfoCodes] = useState({});
  const [unitInfoCodeVariants, setUnitInfoCodeVariants] = useState({});

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalUnit, setModalUnit] = useState(null);
  const [globalModalOpen, setGlobalModalOpen] = useState(false);

  // Load info codes
  useEffect(() => {
    window.electronAPI.loadInfoCodes()
      .then(result => {
        if (result.success) {
          setAllInfoCodes(result.data);
        }
      })
      .catch(err => console.error('Error loading info codes:', err));
  }, []);

  // Transform functions
  const createNode = (level, code, title, definition, systemCode, subsystemCode, children = []) => ({
    level, code, title, definition, children, systemCode, subsystemCode,
    label: `${code} - ${title}`,
    fullCode: systemCode && subsystemCode ? `${systemCode}-${subsystemCode}` : systemCode || code,
  });

  const transformAtaData = (rawData) => {
    return rawData.filter(group => group.system_id).map(group =>
      createNode('group', group.system_id, group.system_id, '', group.system_id, null,
        (group.tables || []).filter(system => system.system_code).map(system =>
          createNode('system', system.system_code, system.title, system.definition, system.system_code, null,
            (system.subsystems || []).filter(sub => sub.subsystem_code && !sub.subsystem_code.includes('thru')).map(sub =>
              createNode('subsystem', sub.subsystem_code, sub.title, sub.definition, system.system_code, sub.subsystem_code.replace('-', ''))
            )
          )
        )
      )
    );
  };

  const transformLegacyGeneralData = (rawData) => {
    const topKey = Object.keys(rawData)[0];
    const groupData = rawData[topKey];
    const groupId = topKey.replace('=', '').trim().replace(/_/g, ' ');
    return [createNode('group', groupId, groupId, '', groupId, null,
      (groupData || []).filter(system => system.System).map(system =>
        createNode('system', system.System, system.Title, system.Definition, system.System, null,
          (system.Subsystems || []).filter(sub => sub.Subsystem).map(sub =>
            createNode('subsystem', sub.Subsystem, sub.Title, sub.Definition, system.System, sub.Subsystem.replace('-', ''))
          )
        )
      )
    )];
  };

  const transformGSVData = (rawData) => {
    return rawData.filter(group => group.system_letter).map(group =>
      createNode('group', group.system_letter, group.system_title, '', group.system_letter, null,
        (group.subsystems || []).filter(system => system.system_code).map(system =>
          createNode('system', system.system_code, system.title, system.definition, system.system_code, null,
            (system.sub_subsystems || []).filter(sub => sub.subsystem_code).map(sub =>
              createNode('subsystem', sub.subsystem_code, sub.title, sub.definition, system.system_code, sub.subsystem_code.replace('-', ''))
            )
          )
        )
      )
    );
  };

  const transformLegacySupportData = (rawData) => {
    if (!rawData || !rawData.System_categories) return [];
    return rawData.System_categories.filter(group => group.System).map(group =>
      createNode('group', group.System, group.Title, '', group.System, null,
        (group.Subsystems || []).filter(system => system.System).map(system =>
          createNode('system', system.System, system.Title, system.Definition, system.System, null, [])
        )
      )
    );
  };

  // Load system data when data source changes
  useEffect(() => {
    if (!dataSource) {
      setSystemData([]);
      return;
    }

    window.electronAPI.loadDmcData(dataSource)
      .then(result => {
        if (!result.success) throw new Error(result.error);
        const data = result.data;
        let transformed;
        if (dataSource.includes('Maintained SNS - Generic') || dataSource.includes('maintained_sns_ordanance')) {
          transformed = transformLegacyGeneralData(data);
        } else if (dataSource === 'gsv.json') {
          transformed = transformGSVData(data);
        } else if (dataSource === 'maintained_sns_support.json') {
          transformed = transformLegacySupportData(data);
        } else {
          transformed = transformAtaData(data);
        }
        setSystemData(transformed);
        setSelectedSystem(null);
        setExpandedNodes(new Set());
      })
      .catch(err => console.error('Error loading system data:', err));
  }, [dataSource]);

  // Filter system data based on search
  const filteredSystemData = useMemo(() => {
    if (!systemSearch.trim()) return systemData;
    const query = systemSearch.toLowerCase();

    const filterNodes = (nodes) => {
      return nodes.map(node => {
        const selfMatch = node.label.toLowerCase().includes(query);
        const filteredChildren = node.children ? filterNodes(node.children) : [];
        if (selfMatch || filteredChildren.length > 0) {
          return { ...node, children: selfMatch ? node.children : filteredChildren };
        }
        return null;
      }).filter(Boolean);
    };

    return filterNodes(systemData);
  }, [systemData, systemSearch]);

  // Auto-expand when searching
  useEffect(() => {
    if (systemSearch) {
      const allNodeKeys = new Set();
      const collectKeys = (nodes) => {
        nodes.forEach(node => {
          allNodeKeys.add(node.code + node.level);
          if (node.children) collectKeys(node.children);
        });
      };
      collectKeys(filteredSystemData);
      setExpandedNodes(allNodeKeys);
    }
  }, [systemSearch, filteredSystemData]);

  // Toggle node expansion
  const handleToggle = useCallback((node) => {
    setExpandedNodes(prev => {
      const key = node.code + node.level;
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Generate units array
  const units = useMemo(() => {
    if (unitCount <= 0) return [0];
    return Array.from({ length: unitCount }, (_, i) => i + 1);
  }, [unitCount]);

  // Reset DC codes when unit count changes
  useEffect(() => {
    setDcCodes({});
    setUnitInfoCodes({});
  }, [unitCount]);

  // Filter info codes for global selection
  const filteredInfoCodes = useMemo(() => {
    if (!infoCodeSearch) return allInfoCodes.slice(0, 50);
    const lower = infoCodeSearch.toLowerCase();
    return allInfoCodes.filter(item =>
      item.code.toLowerCase().includes(lower) ||
      item.title.toLowerCase().includes(lower) ||
      item.type.toLowerCase().includes(lower)
    );
  }, [allInfoCodes, infoCodeSearch]);

  // Generate DM Codes
  const generatedCodes = useMemo(() => {
    if (!modelName || !sdc || !selectedSystem) return [];

    const systemCode = selectedSystem.systemCode;
    const subsystemCode = selectedSystem.subsystemCode || '00';
    const combinedSystemCode = `${systemCode}-${subsystemCode}`;
    const baseInfoCode = globalInfoCode || '000';
    const codes = [];

    units.forEach(unitNum => {
      const unitCode = String(unitNum).padStart(2, '0');
      const dc = (dcCodes[unitNum] || '00').padStart(2, '0');
      const unitCodes = unitInfoCodes[unitNum] || [];
      const unitVariant = unitInfoCodeVariants[unitNum] || infoCodeVariant;

      if (unitCodes.length > 0) {
        unitCodes.forEach(infoCode => {
          const finalInfoCode = `${infoCode}${unitVariant}`;
          codes.push(`${modelName}-${sdc}-${combinedSystemCode}-${unitCode}-${dc}${dmv}-${finalInfoCode}-${itemLocationCode}`);
        });
      } else {
        const finalInfoCode = `${baseInfoCode}${unitVariant}`;
        codes.push(`${modelName}-${sdc}-${combinedSystemCode}-${unitCode}-${dc}${dmv}-${finalInfoCode}-${itemLocationCode}`);
      }
    });

    return codes;
  }, [modelName, sdc, selectedSystem, units, dcCodes, unitInfoCodes, unitInfoCodeVariants, globalInfoCode, infoCodeVariant, itemLocationCode, dmv]);

  // Download single code
  const downloadCode = async (code) => {
    const { Document, Packer, Paragraph } = window.docx;
    const doc = new Document({ sections: [{ children: [new Paragraph(code)] }] });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${code}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download all codes
  const downloadAllCodes = async () => {
    for (const code of generatedCodes) {
      await downloadCode(code);
    }
  };

  return (
    <div className="text-black min-h-screen bg-gray-50">
      {/* Header */}
      <div className=" border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold">DMC Code Generator</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {/* Top Row: Data Source, Model, SDC */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Source</label>
              <select
                value={dataSource}
                onChange={e => setDataSource(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a System Definition File</option>
                {DATA_SOURCES.map(ds => (
                  <option key={ds.value} value={ds.value} title={ds.description}>
                    {ds.label}
                  </option>
                ))}
              </select>
              {dataSource && (
                <p className="mt-1 text-sm text-gray-600 italic">
                  {DATA_SOURCES.find(ds => ds.value === dataSource)?.description}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model Name</label>
              <input
                type="text"
                value={modelName}
                onChange={e => setModelName(e.target.value)}
                placeholder="e.g., S1000D"
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SDC</label>
              <input
                type="text"
                value={sdc}
                onChange={e => setSdc(e.target.value)}
                placeholder="e.g., 01"
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Column: System Hierarchy */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h3 className="font-semibold mb-2">System Hierarchy</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search by code or title..."
                  value={systemSearch}
                  onChange={e => setSystemSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {selectedSystem && (
                <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                  <strong>Selected:</strong> {selectedSystem.fullCode} - {selectedSystem.title}
                </div>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {filteredSystemData.length === 0 ? (
                <div className="p-4 text-gray-500 text-center">
                  {dataSource ? 'No results found' : 'Select a data source to load hierarchy'}
                </div>
              ) : (
                filteredSystemData.map((node, idx) => (
                  <TreeItem
                    key={`${node.code}-${idx}`}
                    node={node}
                    level={node.level}
                    query={systemSearch}
                    selectedNode={selectedSystem}
                    onSelect={setSelectedSystem}
                    expandedNodes={expandedNodes}
                    onToggle={handleToggle}
                  />
                ))
              )}
            </div>
          </div>

          {/* Right Column: Additional Options */}
          <div className="space-y-4">
            {/* Global Info Code */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold mb-2">Global Info Code</h3>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search info codes..."
                  value={infoCodeSearch}
                  onChange={e => setInfoCodeSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {globalInfoCode && (
                <div className="mb-2 p-2 bg-green-50 rounded text-sm">
                  <strong>Selected:</strong> {globalInfoCode} - {allInfoCodes.find(c => c.code === globalInfoCode)?.title}
                </div>
              )}
              <div className="max-h-40 overflow-y-auto border rounded">
                {filteredInfoCodes.map(item => (
                  <div
                    key={item.code}
                    className={`flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-50 border-b ${globalInfoCode === item.code ? 'bg-green-50' : ''}`}
                    onClick={() => setGlobalInfoCode(item.code)}
                  >
                    <span className="font-bold text-blue-600 w-10">{item.code}</span>
                    <span className="text-xs text-gray-500 w-16">{item.type}</span>
                    <span className="text-sm flex-1 truncate">{item.title}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Other Options Row */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">DMV</label>
                  <input
                    type="text"
                    value={dmv}
                    onChange={e => setDmv(e.target.value)}
                    placeholder="e.g., A"
                    maxLength={1}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit Count</label>
                  <input
                    type="number"
                    value={unitCount}
                    onChange={e => setUnitCount(parseInt(e.target.value) || 0)}
                    min={0}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Info Code Variant</label>
                  <input
                    type="text"
                    value={infoCodeVariant}
                    onChange={e => setInfoCodeVariant(e.target.value)}
                    placeholder="e.g., A"
                    maxLength={1}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location Code</label>
                  <select
                    value={itemLocationCode}
                    onChange={e => setItemLocationCode(e.target.value)}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {ITEM_LOCATION_CODES.map(loc => (
                      <option key={loc.value} value={loc.value}>{loc.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* DC Codes Table */}
        <div className="bg-white rounded-lg shadow mt-4">
          <div className="p-4 border-b">
            <h3 className="font-semibold">DC Codes and Info Codes per Unit</h3>
            <p className="text-sm text-gray-500">Click + to select multiple info codes per unit. Leave empty to use global info code.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Unit #</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">DC Code (2 digits)</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Info Codes</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Info Code Variant</th>
                </tr>
              </thead>
              <tbody>
                {units.map(unitNum => (
                  <tr key={unitNum} className="border-t">
                    <td className="px-4 py-3 text-center font-mono">{String(unitNum).padStart(2, '0')}</td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={dcCodes[unitNum] || ''}
                        onChange={e => setDcCodes(prev => ({ ...prev, [unitNum]: e.target.value }))}
                        placeholder="00"
                        maxLength={2}
                        className="w-20 p-2 border rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`flex-1 text-sm ${(unitInfoCodes[unitNum]?.length > 0) ? 'text-green-600' : 'text-gray-400'}`}>
                          {(unitInfoCodes[unitNum]?.length > 0) ? unitInfoCodes[unitNum].join(', ') : 'None (uses global)'}
                        </span>
                        <button
                          onClick={() => { setModalUnit(unitNum); setModalOpen(true); }}
                          className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={unitInfoCodeVariants[unitNum] || ''}
                        onChange={e => setUnitInfoCodeVariants(prev => ({ ...prev, [unitNum]: e.target.value.toUpperCase() }))}
                        placeholder={infoCodeVariant}
                        maxLength={1}
                        className="w-16 p-2 border rounded focus:ring-2 focus:ring-blue-500 text-center uppercase"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Generated Codes */}
        <div className="bg-white rounded-lg shadow mt-4">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold">Generated DMC Codes ({generatedCodes.length})</h3>
            {generatedCodes.length > 1 && (
              <button
                onClick={downloadAllCodes}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                <Download size={16} />
                Download All
              </button>
            )}
          </div>
          <div className="p-4">
            {generatedCodes.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                Fill in the required fields (Model Name, SDC, System) to generate codes
              </div>
            ) : (
              <div className="space-y-2">
                {generatedCodes.map((code, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg font-mono text-sm">
                    <span>{code}</span>
                    <button
                      onClick={() => downloadCode(code)}
                      className="p-2 text-blue-500 hover:bg-blue-50 rounded"
                      title="Download"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info Code Modal */}
      <InfoCodeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        unitNum={modalUnit}
        allInfoCodes={allInfoCodes}
        selectedCodes={unitInfoCodes[modalUnit] || []}
        onApply={(codes) => setUnitInfoCodes(prev => ({ ...prev, [modalUnit]: codes }))}
      />

      {/* Load docx library */}
      <script src="/version2.0/lib/docx.min.js"></script>
    </div>
  );
};

export default DmcGeneratorPage;
