import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Download,
  Eye,
  Copy,
  X,
  Settings,
  FolderPlus,
  Upload,
  GripVertical
} from 'lucide-react';

// Tree Node Component
const TreeNode = ({ node, level = 0, onToggle, onSelect, onDelete, onMoveUp, onMoveDown, selectedId }) => {
  const isFolder = node.type === 'folder';
  const isSelected = selectedId === node.id;
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="select-none">
      <div
        className={`flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer hover:bg-gray-700 ${isSelected ? 'bg-blue-600' : ''
          }`}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
        onClick={() => onSelect(node.id)}
      >
        {isFolder ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
            className="p-0.5 hover:bg-gray-600 rounded"
          >
            {node.expanded ? (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-400" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        {isFolder ? (
          <FolderOpen className="h-4 w-4 text-yellow-500" />
        ) : (
          <FileText className="h-4 w-4 text-blue-400" />
        )}

        <span className="text-sm text-white truncate flex-1" title={node.name}>
          {node.name}
        </span>

        {node.techName && node.techName !== 'N/A' && (
          <span className="text-xs text-gray-400 truncate max-w-[150px]" title={node.techName}>
            {node.techName}
          </span>
        )}
      </div>

      {isFolder && node.expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              onToggle={onToggle}
              onSelect={onSelect}
              onDelete={onDelete}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const PmcBuilderPage = () => {
  const navigate = useNavigate();
  const folderInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const resizeRef = useRef(null);

  // Tree structure state
  const [treeData, setTreeData] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [nextId, setNextId] = useState(1);

  // Resizable panel state
  const [metadataPanelWidth, setMetadataPanelWidth] = useState(450);
  const [isResizing, setIsResizing] = useState(false);

  // Metadata state
  const [metadata, setMetadata] = useState({
    pmCode_modelIdentCode: 'MODEL',
    pmCode_pmIssuer: '00000',
    pmCode_pmNumber: '00000',
    pmCode_pmVolume: '00',
    language_countryIsoCode: 'US',
    language_languageIsoCode: 'en',
    issueInfo_issueNumber: '001',
    issueInfo_inWork: '00',
    issueDate_year: new Date().getFullYear().toString(),
    issueDate_month: String(new Date().getMonth() + 1).padStart(2, '0'),
    issueDate_day: String(new Date().getDate()).padStart(2, '0'),
    pmTitle: 'Publication Module',
    shortPmTitle: 'PM',
    securityClassification: '01',
    responsiblePartnerCompany_enterpriseCode: '00000',
    responsiblePartnerCompany_enterpriseName: 'ENTERPRISE',
    originator_enterpriseCode: '00000',
    originator_enterpriseName: 'ENTERPRISE'
  });

  // UI state
  const [showMetadataPanel, setShowMetadataPanel] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [generatedXml, setGeneratedXml] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  // Generate unique ID
  const generateId = () => {
    const id = nextId;
    setNextId(prev => prev + 1);
    return id;
  };

  // Parse DMC filename
  const parseDmcFilename = (filename) => {
    const pattern = /DMC-(?<modelIdentCode>[\w-]+?)-(?<systemDiffCode>\w+?)-(?<systemCode>\w{2})-(?<subSysCombined>\d+)-(?<assyCode>\d+)-(?<disassyCombined>\w+)-(?<infoCombined>\w+)-(?<itemLocationCode>\w)(?:_(?<issueNumber>\d{3})-(?<inWork>\d{2})_(?<languageIsoCode>.+?)-(?<countryIsoCode>.+?))?\.XML/i;
    const match = filename.match(pattern);
    if (!match) return null;

    const data = match.groups;
    data.issueNumber = data.issueNumber || '001';
    data.inWork = data.inWork || '00';
    data.languageIsoCode = data.languageIsoCode || 'en';
    data.countryIsoCode = data.countryIsoCode || 'US';

    const subSys = data.subSysCombined;
    data.subSystemCode = subSys[0] || '0';
    data.subSubSystemCode = subSys[1] || '0';

    const disassy = data.disassyCombined;
    if (disassy && /[A-Za-z]$/.test(disassy)) {
      data.disassyCode = disassy.slice(0, -1);
      data.disassyCodeVariant = disassy.slice(-1);
    } else {
      data.disassyCode = disassy;
      data.disassyCodeVariant = 'A';
    }

    const info = data.infoCombined;
    if (info && /[A-Za-z]$/.test(info)) {
      data.infoCode = info.slice(0, -1);
      data.infoCodeVariant = info.slice(-1);
    } else {
      data.infoCode = info;
      data.infoCodeVariant = 'A';
    }

    return data;
  };

  // Handle folder upload - preserves structure
  const handleFolderUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setError('');
    setProgress(10);

    // Build folder structure from webkitRelativePath
    const structure = {};
    const dmFiles = [];

    files.forEach((file, index) => {
      const relativePath = file.webkitRelativePath;
      const pathParts = relativePath.split('/');

      // Check if it's a valid DM file
      if (file.name.toUpperCase().endsWith('.XML') && parseDmcFilename(file.name)) {
        dmFiles.push({
          file,
          path: relativePath,
          pathParts
        });
      }

      setProgress(10 + Math.floor((index / files.length) * 40));
    });

    setProgress(50);

    // Build tree structure
    const buildTree = (dmFiles) => {
      const root = [];
      const folderMap = new Map();
      let currentId = nextId;

      // Sort by path for consistent ordering
      dmFiles.sort((a, b) => a.path.localeCompare(b.path));

      dmFiles.forEach(({ file, pathParts }) => {
        let currentLevel = root;
        let currentPath = '';

        // Process each folder in path (except last which is the file)
        for (let i = 0; i < pathParts.length - 1; i++) {
          const folderName = pathParts[i];
          currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;

          if (!folderMap.has(currentPath)) {
            const newFolder = {
              id: currentId++,
              name: folderName,
              type: 'folder',
              expanded: true,
              children: []
            };
            currentLevel.push(newFolder);
            folderMap.set(currentPath, newFolder);
          }

          currentLevel = folderMap.get(currentPath).children;
        }

        // Add the DM file
        const dmData = parseDmcFilename(file.name);
        currentLevel.push({
          id: currentId++,
          name: file.name,
          type: 'dm',
          file: file,
          path: pathParts.join('/'),
          techName: 'N/A',
          infoName: 'N/A',
          dmData
        });
      });

      setNextId(currentId);
      return root;
    };

    const tree = buildTree(dmFiles);
    setProgress(70);

    // Try to extract metadata from XML files
    const extractMetadata = async (node) => {
      if (node.type === 'dm' && node.file) {
        try {
          const text = await node.file.text();
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(text, 'text/xml');

          const techNameEl = xmlDoc.querySelector('techName');
          const infoNameEl = xmlDoc.querySelector('infoName');
          const issueDateEl = xmlDoc.querySelector('issueDate');

          if (techNameEl) node.techName = techNameEl.textContent || 'N/A';
          if (infoNameEl) node.infoName = infoNameEl.textContent || 'N/A';
          if (issueDateEl) {
            node.issueDate = {
              year: issueDateEl.getAttribute('year') || '1970',
              month: issueDateEl.getAttribute('month') || '01',
              day: issueDateEl.getAttribute('day') || '01'
            };
          }
        } catch (err) {
          console.warn('Could not parse XML:', node.name, err);
        }
      }

      if (node.children) {
        for (const child of node.children) {
          await extractMetadata(child);
        }
      }
    };

    // Extract metadata from all nodes
    for (const node of tree) {
      await extractMetadata(node);
    }

    setProgress(100);
    setTreeData(tree);

    setTimeout(() => setProgress(0), 500);

    // Reset file input
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
  };

  // Handle individual file uploads
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setError('');
    const newNodes = [];

    for (const file of files) {
      if (file.name.toUpperCase().endsWith('.XML') && parseDmcFilename(file.name)) {
        const dmData = parseDmcFilename(file.name);
        const node = {
          id: generateId(),
          name: file.name,
          type: 'dm',
          file: file,
          techName: 'N/A',
          infoName: 'N/A',
          dmData
        };

        // Try to extract metadata
        try {
          const text = await file.text();
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(text, 'text/xml');

          const techNameEl = xmlDoc.querySelector('techName');
          const infoNameEl = xmlDoc.querySelector('infoName');
          const issueDateEl = xmlDoc.querySelector('issueDate');

          if (techNameEl) node.techName = techNameEl.textContent || 'N/A';
          if (infoNameEl) node.infoName = infoNameEl.textContent || 'N/A';
          if (issueDateEl) {
            node.issueDate = {
              year: issueDateEl.getAttribute('year') || '1970',
              month: issueDateEl.getAttribute('month') || '01',
              day: issueDateEl.getAttribute('day') || '01'
            };
          }
        } catch (err) {
          console.warn('Could not parse XML:', file.name);
        }

        newNodes.push(node);
      }
    }

    // Add to selected folder or root
    if (selectedNodeId) {
      setTreeData(prev => addNodesToParent(prev, selectedNodeId, newNodes));
    } else {
      setTreeData(prev => [...prev, ...newNodes]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Add nodes to a parent folder
  const addNodesToParent = (tree, parentId, newNodes) => {
    return tree.map(node => {
      if (node.id === parentId && node.type === 'folder') {
        return {
          ...node,
          children: [...(node.children || []), ...newNodes]
        };
      }
      if (node.children) {
        return {
          ...node,
          children: addNodesToParent(node.children, parentId, newNodes)
        };
      }
      return node;
    });
  };

  // Toggle folder expand/collapse
  const toggleNode = (nodeId) => {
    setTreeData(prev => toggleNodeInTree(prev, nodeId));
  };

  const toggleNodeInTree = (tree, nodeId) => {
    return tree.map(node => {
      if (node.id === nodeId) {
        return { ...node, expanded: !node.expanded };
      }
      if (node.children) {
        return { ...node, children: toggleNodeInTree(node.children, nodeId) };
      }
      return node;
    });
  };

  // Select a node
  const selectNode = (nodeId) => {
    setSelectedNodeId(nodeId === selectedNodeId ? null : nodeId);
  };

  // Delete selected node
  const deleteNode = (nodeId) => {
    setTreeData(prev => deleteNodeFromTree(prev, nodeId));
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
  };

  const deleteNodeFromTree = (tree, nodeId) => {
    return tree.filter(node => {
      if (node.id === nodeId) return false;
      if (node.children) {
        node.children = deleteNodeFromTree(node.children, nodeId);
      }
      return true;
    });
  };

  // Add new folder
  const addFolder = () => {
    const folderName = prompt('Enter folder name:');
    if (!folderName) return;

    const newFolder = {
      id: generateId(),
      name: folderName,
      type: 'folder',
      expanded: true,
      children: []
    };

    if (selectedNodeId) {
      // Check if selected is a folder
      const selectedNode = findNodeById(treeData, selectedNodeId);
      if (selectedNode && selectedNode.type === 'folder') {
        setTreeData(prev => addNodesToParent(prev, selectedNodeId, [newFolder]));
      } else {
        setTreeData(prev => [...prev, newFolder]);
      }
    } else {
      setTreeData(prev => [...prev, newFolder]);
    }
  };

  // Find node by ID
  const findNodeById = (tree, nodeId) => {
    for (const node of tree) {
      if (node.id === nodeId) return node;
      if (node.children) {
        const found = findNodeById(node.children, nodeId);
        if (found) return found;
      }
    }
    return null;
  };

  // Move node up/down
  const moveNode = (direction) => {
    if (!selectedNodeId) return;
    setTreeData(prev => moveNodeInTree(prev, selectedNodeId, direction));
  };

  const moveNodeInTree = (tree, nodeId, direction) => {
    const index = tree.findIndex(node => node.id === nodeId);
    if (index !== -1) {
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex >= 0 && newIndex < tree.length) {
        const newTree = [...tree];
        [newTree[index], newTree[newIndex]] = [newTree[newIndex], newTree[index]];
        return newTree;
      }
      return tree;
    }

    return tree.map(node => {
      if (node.children) {
        return { ...node, children: moveNodeInTree(node.children, nodeId, direction) };
      }
      return node;
    });
  };

  // Generate PM XML
  const generatePmXml = async () => {
    setIsGenerating(true);
    setProgress(10);
    setError('');

    try {
      // Build content XML
      const buildContentXml = (nodes, indent = '    ') => {
        let xml = '';

        for (const node of nodes) {
          if (node.type === 'folder') {
            xml += `${indent}<pmEntry>\n`;
            xml += `${indent}  <pmEntryTitle>${escapeXml(node.name)}</pmEntryTitle>\n`;
            if (node.children && node.children.length > 0) {
              xml += buildContentXml(node.children, indent + '  ');
            }
            xml += `${indent}</pmEntry>\n`;
          } else if (node.type === 'dm' && node.dmData) {
            const dm = node.dmData;
            xml += `${indent}<pmEntry>\n`;
            xml += `${indent}  <dmRef>\n`;
            xml += `${indent}    <dmRefIdent>\n`;
            xml += `${indent}      <dmCode modelIdentCode="${dm.modelIdentCode}" systemDiffCode="${dm.systemDiffCode}" systemCode="${dm.systemCode}" subSystemCode="${dm.subSystemCode}" subSubSystemCode="${dm.subSubSystemCode}" assyCode="${dm.assyCode}" disassyCode="${dm.disassyCode}" disassyCodeVariant="${dm.disassyCodeVariant}" infoCode="${dm.infoCode}" infoCodeVariant="${dm.infoCodeVariant}" itemLocationCode="${dm.itemLocationCode}"/>\n`;
            xml += `${indent}      <issueInfo issueNumber="${dm.issueNumber}" inWork="${dm.inWork}"/>\n`;
            xml += `${indent}      <language languageIsoCode="${dm.languageIsoCode.toLowerCase()}" countryIsoCode="${dm.countryIsoCode.toUpperCase()}"/>\n`;
            xml += `${indent}    </dmRefIdent>\n`;
            xml += `${indent}    <dmRefAddressItems>\n`;
            xml += `${indent}      <dmTitle>\n`;
            xml += `${indent}        <techName>${escapeXml(node.techName || 'N/A')}</techName>\n`;
            xml += `${indent}        <infoName>${escapeXml(node.infoName || 'N/A')}</infoName>\n`;
            xml += `${indent}      </dmTitle>\n`;
            if (node.issueDate) {
              xml += `${indent}      <issueDate year="${node.issueDate.year}" month="${node.issueDate.month}" day="${node.issueDate.day}"/>\n`;
            } else {
              xml += `${indent}      <issueDate year="1970" month="01" day="01"/>\n`;
            }
            xml += `${indent}    </dmRefAddressItems>\n`;
            xml += `${indent}  </dmRef>\n`;
            xml += `${indent}</pmEntry>\n`;
          }
        }

        return xml;
      };

      const escapeXml = (str) => {
        return str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
      };

      setProgress(50);

      // Build full PM XML
      const doctype = `<!DOCTYPE pm [
<!-- Begin Document Specific Declarations -->
<!ENTITY % ISOEntities PUBLIC "ISO 8879-1986//ENTITIES ISO Character Entities 20030531//EN//XML" "http://www.s1000d.org/S1000D_4-2/ent/ISOEntities">
%ISOEntities;
<!-- End Document Specific Declarations -->
]>`;

      const xml = `<?xml version="1.0" encoding="utf-8"?>
${doctype}
<pm xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:dc="http://www.purl.org/dc/elements/1.1/" xmlns:xlink="http://www.w3.org/1999/xlink">
  <identAndStatusSection>
    <pmAddress>
      <pmIdent>
        <pmCode modelIdentCode="${metadata.pmCode_modelIdentCode}" pmIssuer="${metadata.pmCode_pmIssuer}" pmNumber="${metadata.pmCode_pmNumber}" pmVolume="${metadata.pmCode_pmVolume}"/>
        <language countryIsoCode="${metadata.language_countryIsoCode}" languageIsoCode="${metadata.language_languageIsoCode}"/>
        <issueInfo issueNumber="${metadata.issueInfo_issueNumber}" inWork="${metadata.issueInfo_inWork}"/>
      </pmIdent>
      <pmAddressItems>
        <issueDate year="${metadata.issueDate_year}" month="${metadata.issueDate_month}" day="${metadata.issueDate_day}"/>
        <pmTitle>${escapeXml(metadata.pmTitle)}</pmTitle>
        <shortPmTitle>${escapeXml(metadata.shortPmTitle)}</shortPmTitle>
      </pmAddressItems>
    </pmAddress>
    <pmStatus>
      <security securityClassification="${metadata.securityClassification}"/>
      <responsiblePartnerCompany enterpriseCode="${metadata.responsiblePartnerCompany_enterpriseCode}">
        <enterpriseName>${escapeXml(metadata.responsiblePartnerCompany_enterpriseName)}</enterpriseName>
      </responsiblePartnerCompany>
      <originator enterpriseCode="${metadata.originator_enterpriseCode}">
        <enterpriseName>${escapeXml(metadata.originator_enterpriseName)}</enterpriseName>
      </originator>
      <applic>
        <displayText>
          <simplePara>APPLIC</simplePara>
        </displayText>
      </applic>
      <brexDmRef>
        <dmRef>
          <dmRefIdent>
            <dmCode modelIdentCode="MM" systemDiffCode="A" systemCode="00" subSystemCode="0" subSubSystemCode="0" assyCode="00" disassyCode="00" disassyCodeVariant="A" infoCode="000" infoCodeVariant="A" itemLocationCode="A"/>
          </dmRefIdent>
        </dmRef>
      </brexDmRef>
      <qualityAssurance>
        <unverified/>
      </qualityAssurance>
    </pmStatus>
  </identAndStatusSection>
  <content>
${buildContentXml(treeData)}  </content>
</pm>`;

      setProgress(100);
      setGeneratedXml(xml);
      setShowPreview(true);

    } catch (err) {
      setError('Failed to generate XML: ' + err.message);
    } finally {
      setIsGenerating(false);
      setTimeout(() => setProgress(0), 500);
    }
  };

  // Download XML
  const downloadXml = () => {
    if (!generatedXml) return;

    const filename = `PMC-${metadata.pmCode_modelIdentCode}-${metadata.pmCode_pmIssuer}-${metadata.pmCode_pmNumber}.xml`;
    const blob = new Blob([generatedXml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Copy XML to clipboard
  const copyXml = async () => {
    if (!generatedXml) return;
    try {
      await navigator.clipboard.writeText(generatedXml);
      alert('XML copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Count total DMs
  const countDms = (nodes) => {
    let count = 0;
    for (const node of nodes) {
      if (node.type === 'dm') count++;
      if (node.children) count += countDms(node.children);
    }
    return count;
  };

  // Resize handlers
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleMouseMove = useCallback((e) => {
    if (!isResizing) return;
    const containerWidth = window.innerWidth;
    const newWidth = containerWidth - e.clientX;
    // Constrain between 300px and 700px
    setMetadataPanelWidth(Math.min(Math.max(newWidth, 300), 700));
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Add/remove mouse event listeners for resizing
  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-xl font-bold">S1000D PMC Builder</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">
              {countDms(treeData)} Data Module(s)
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Panel - Tree Structure (takes remaining space) */}
        <div className="flex-1 border-r border-gray-700 flex flex-col min-w-[300px]">
          {/* Toolbar */}
          <div className="bg-gray-800 px-4 py-3 border-b border-gray-700">
            <div className="flex flex-wrap gap-2">
              {/* Folder Upload */}
              <input
                ref={folderInputRef}
                type="file"
                webkitdirectory=""
                directory=""
                multiple
                onChange={handleFolderUpload}
                className="hidden"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => folderInputRef.current?.click()}
                className="bg-gray-700 border-gray-600 hover:bg-gray-600"
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                Import Folder
              </Button>

              {/* File Upload */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xml,.XML"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="bg-gray-700 border-gray-600 hover:bg-gray-600"
              >
                <Upload className="h-4 w-4 mr-2" />
                Add DM(s)
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={addFolder}
                className="bg-gray-700 border-gray-600 hover:bg-gray-600"
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                Add Folder
              </Button>

              <div className="border-l border-gray-600 mx-1" />

              <Button
                size="sm"
                variant="outline"
                onClick={() => moveNode('up')}
                disabled={!selectedNodeId}
                className="bg-gray-700 border-gray-600 hover:bg-gray-600 disabled:opacity-50"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => moveNode('down')}
                disabled={!selectedNodeId}
                className="bg-gray-700 border-gray-600 hover:bg-gray-600 disabled:opacity-50"
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => selectedNodeId && deleteNode(selectedNodeId)}
                disabled={!selectedNodeId}
                className="bg-red-900 border-red-800 hover:bg-red-800 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Tree View */}
          <div className="flex-1 overflow-auto p-4">
            {treeData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <FolderOpen className="h-16 w-16 mb-4" />
                <p className="text-lg font-medium">No Data Modules</p>
                <p className="text-sm mt-2">Import a folder or add individual DM files</p>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg p-2">
                {treeData.map(node => (
                  <TreeNode
                    key={node.id}
                    node={node}
                    onToggle={toggleNode}
                    onSelect={selectNode}
                    onDelete={deleteNode}
                    onMoveUp={() => moveNode('up')}
                    onMoveDown={() => moveNode('down')}
                    selectedId={selectedNodeId}
                  />
                ))}
              </div>
            )}
          </div>

          {progress > 0 && (
            <div className="px-4 pb-4">
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>

        {/* Resize Handle */}
        <div
          ref={resizeRef}
          className={`w-1 bg-gray-700 hover:bg-blue-500 cursor-col-resize flex items-center justify-center transition-colors ${isResizing ? 'bg-blue-500' : ''}`}
          onMouseDown={handleMouseDown}
        >
          <div className="w-4 h-8 flex items-center justify-center">
            <GripVertical className="h-4 w-4 text-gray-500" />
          </div>
        </div>

        {/* Right Panel - Metadata & Actions (resizable width) */}
        <div
          className="flex flex-col bg-gray-900"
          style={{ width: `${metadataPanelWidth}px`, minWidth: '300px', maxWidth: '700px' }}
        >
          {/* Metadata Section */}
          <div className="flex-1 overflow-auto p-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Publication Module Metadata
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowMetadataPanel(!showMetadataPanel)}
                  >
                    {showMetadataPanel ? 'Collapse' : 'Expand'}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {showMetadataPanel ? (
                  <div className="grid grid-cols-2 gap-4">
                    {/* PM Code Section */}
                    <div className="col-span-2">
                      <h4 className="text-sm font-medium text-gray-400 mb-2">PM Code</h4>
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <label className="text-xs text-gray-500">Model Ident</label>
                          <input
                            type="text"
                            value={metadata.pmCode_modelIdentCode}
                            onChange={e => setMetadata({ ...metadata, pmCode_modelIdentCode: e.target.value })}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">PM Issuer</label>
                          <input
                            type="text"
                            value={metadata.pmCode_pmIssuer}
                            onChange={e => setMetadata({ ...metadata, pmCode_pmIssuer: e.target.value })}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">PM Number</label>
                          <input
                            type="text"
                            value={metadata.pmCode_pmNumber}
                            onChange={e => setMetadata({ ...metadata, pmCode_pmNumber: e.target.value })}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">PM Volume</label>
                          <input
                            type="text"
                            value={metadata.pmCode_pmVolume}
                            onChange={e => setMetadata({ ...metadata, pmCode_pmVolume: e.target.value })}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Language & Issue */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Language</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-500">Language Code</label>
                          <input
                            type="text"
                            value={metadata.language_languageIsoCode}
                            onChange={e => setMetadata({ ...metadata, language_languageIsoCode: e.target.value })}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Country Code</label>
                          <input
                            type="text"
                            value={metadata.language_countryIsoCode}
                            onChange={e => setMetadata({ ...metadata, language_countryIsoCode: e.target.value })}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Issue Info</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-500">Issue Number</label>
                          <input
                            type="text"
                            value={metadata.issueInfo_issueNumber}
                            onChange={e => setMetadata({ ...metadata, issueInfo_issueNumber: e.target.value })}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">In Work</label>
                          <input
                            type="text"
                            value={metadata.issueInfo_inWork}
                            onChange={e => setMetadata({ ...metadata, issueInfo_inWork: e.target.value })}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Issue Date */}
                    <div className="col-span-2">
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Issue Date</h4>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-xs text-gray-500">Year</label>
                          <input
                            type="text"
                            value={metadata.issueDate_year}
                            onChange={e => setMetadata({ ...metadata, issueDate_year: e.target.value })}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Month</label>
                          <input
                            type="text"
                            value={metadata.issueDate_month}
                            onChange={e => setMetadata({ ...metadata, issueDate_month: e.target.value })}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Day</label>
                          <input
                            type="text"
                            value={metadata.issueDate_day}
                            onChange={e => setMetadata({ ...metadata, issueDate_day: e.target.value })}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Titles */}
                    <div className="col-span-2">
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Titles</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-500">PM Title</label>
                          <input
                            type="text"
                            value={metadata.pmTitle}
                            onChange={e => setMetadata({ ...metadata, pmTitle: e.target.value })}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Short PM Title</label>
                          <input
                            type="text"
                            value={metadata.shortPmTitle}
                            onChange={e => setMetadata({ ...metadata, shortPmTitle: e.target.value })}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Security */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Security</h4>
                      <select
                        value={metadata.securityClassification}
                        onChange={e => setMetadata({ ...metadata, securityClassification: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                      >
                        <option value="01">01 - Unclassified</option>
                        <option value="02">02 - Restricted</option>
                        <option value="03">03 - Confidential</option>
                        <option value="04">04 - Secret</option>
                        <option value="05">05 - Top Secret</option>
                      </select>
                    </div>

                    {/* Responsible Partner Company */}
                    <div className="col-span-2">
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Responsible Partner Company</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-500">Enterprise Code</label>
                          <input
                            type="text"
                            value={metadata.responsiblePartnerCompany_enterpriseCode}
                            onChange={e => setMetadata({ ...metadata, responsiblePartnerCompany_enterpriseCode: e.target.value })}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Enterprise Name</label>
                          <input
                            type="text"
                            value={metadata.responsiblePartnerCompany_enterpriseName}
                            onChange={e => setMetadata({ ...metadata, responsiblePartnerCompany_enterpriseName: e.target.value })}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Originator */}
                    <div className="col-span-2">
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Originator</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-500">Enterprise Code</label>
                          <input
                            type="text"
                            value={metadata.originator_enterpriseCode}
                            onChange={e => setMetadata({ ...metadata, originator_enterpriseCode: e.target.value })}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Enterprise Name</label>
                          <input
                            type="text"
                            value={metadata.originator_enterpriseName}
                            onChange={e => setMetadata({ ...metadata, originator_enterpriseName: e.target.value })}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-400">
                    <p><strong>Title:</strong> {metadata.pmTitle}</p>
                    <p><strong>PM Code:</strong> {metadata.pmCode_modelIdentCode}-{metadata.pmCode_pmIssuer}-{metadata.pmCode_pmNumber}-{metadata.pmCode_pmVolume}</p>
                    <p><strong>Issue:</strong> {metadata.issueInfo_issueNumber}-{metadata.issueInfo_inWork}</p>
                    <p className="text-xs mt-2">Click Expand to edit all metadata fields</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {error && (
              <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded text-red-200 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="bg-gray-800 border-t border-gray-700 px-4 py-4">
            <div className="flex gap-3">
              <Button
                onClick={generatePmXml}
                disabled={treeData.length === 0 || isGenerating}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isGenerating ? 'Generating...' : 'Generate PM XML'}
              </Button>
              <Button
                onClick={() => setShowPreview(true)}
                disabled={!generatedXml}
                variant="outline"
                className="bg-gray-700 border-gray-600"
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button
                onClick={downloadXml}
                disabled={!generatedXml}
                variant="outline"
                className="bg-green-900 border-green-800 hover:bg-green-800"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && generatedXml && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <h3 className="text-lg font-medium">Generated PM XML Preview</h3>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={copyXml}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button size="sm" variant="outline" onClick={downloadXml}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowPreview(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap break-all">
                {generatedXml}
              </pre>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default PmcBuilderPage;
