import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  Upload,
  FileText,
  Download,
  Eye,
  Copy,
  X,
  Trash2,
  List,
  GripVertical,
  FolderOpen,
  ChevronRight,
  ChevronDown
} from 'lucide-react';

// Tree Node for preview
const TocTreeNode = ({ node, level = 0 }) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.Children && node.Children.length > 0;
  const isCategory = node.Type === 0;

  return (
    <div className="select-none">
      <div
        className={`flex items-center gap-2 py-1 px-2 rounded hover:bg-gray-700 ${isCategory ? 'text-yellow-400' : 'text-blue-400'}`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-0.5 hover:bg-gray-600 rounded"
          >
            {expanded ? (
              <ChevronDown className="h-3 w-3 text-gray-400" />
            ) : (
              <ChevronRight className="h-3 w-3 text-gray-400" />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}

        {isCategory ? (
          <FolderOpen className="h-3 w-3" />
        ) : (
          <FileText className="h-3 w-3" />
        )}

        <span className="text-xs truncate flex-1" title={node.DisplayName}>
          {node.DisplayName || node.DMC || 'Untitled'}
        </span>

        {node.DMC && (
          <span className="text-[10px] text-gray-500 truncate max-w-[150px]">
            {node.DMC}
          </span>
        )}
      </div>

      {hasChildren && expanded && (
        <div>
          {node.Children.map((child, idx) => (
            <TocTreeNode key={child.ID || idx} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

const TocBuilderPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const resizeRef = useRef(null);

  // State
  const [files, setFiles] = useState([]);
  const [generatedJs, setGeneratedJs] = useState('');
  const [tocData, setTocData] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewMode, setPreviewMode] = useState('tree'); // 'tree' or 'code'

  // Resizable panel
  const [panelWidth, setPanelWidth] = useState(450);
  const [isResizing, setIsResizing] = useState(false);

  // Handle file upload
  const handleFileUpload = (e) => {
    const newFiles = Array.from(e.target.files).filter(
      f => f.name.toLowerCase().endsWith('.xml')
    );
    setFiles(prev => [...prev, ...newFiles]);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove file
  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Clear all files
  const clearFiles = () => {
    setFiles([]);
    setGeneratedJs('');
    setTocData([]);
  };

  // Generate DMC string from dmCode attributes
  const generateDmcString = (dmCode) => {
    if (!dmCode) return '';
    return [
      dmCode.getAttribute('modelIdentCode'),
      dmCode.getAttribute('systemDiffCode'),
      dmCode.getAttribute('systemCode'),
      dmCode.getAttribute('subSystemCode') + dmCode.getAttribute('subSubSystemCode'),
      dmCode.getAttribute('assyCode'),
      dmCode.getAttribute('disassyCode') + dmCode.getAttribute('disassyCodeVariant'),
      dmCode.getAttribute('infoCode') + dmCode.getAttribute('infoCodeVariant'),
      dmCode.getAttribute('itemLocationCode')
    ].join('-');
  };

  // Process pmEntry recursively
  const processPmEntry = (pmEntry, parentId = null) => {
    const results = [];
    const title = pmEntry.querySelector(':scope > pmEntryTitle');
    const titleText = title ? title.textContent.trim() : '';

    // Generate unique ID
    const entryId = `entry-${Math.random().toString(36).substr(2, 9)}`;

    // If has title, create category entry
    if (titleText) {
      results.push({
        ID: entryId,
        CategoryId: parentId,
        DisplayName: titleText,
        PMEntryType: null,
        DMC: null,
        AddedNew: false,
        dmIdUpissued: false,
        dmId: 0,
        pmId: 0,
        expanded: false,
        Type: 0, // Category
        dmRef: null,
        pmRefs: null,
        Children: []
      });
    }

    // Process child pmEntries
    const childPmEntries = pmEntry.querySelectorAll(':scope > pmEntry');
    childPmEntries.forEach(childEntry => {
      const childResults = processPmEntry(childEntry, titleText ? entryId : parentId);
      results.push(...childResults);
    });

    // Process dmRefs
    const dmRefs = pmEntry.querySelectorAll(':scope > dmRef');
    dmRefs.forEach(dmRef => {
      const dmRefIdent = dmRef.querySelector('dmRefIdent');
      const dmCode = dmRefIdent?.querySelector('dmCode');
      const issueInfo = dmRefIdent?.querySelector('issueInfo');
      const language = dmRefIdent?.querySelector('language');
      const dmRefAddressItems = dmRef.querySelector('dmRefAddressItems');
      const dmTitle = dmRefAddressItems?.querySelector('dmTitle');
      const techName = dmTitle?.querySelector('techName')?.textContent?.trim() || '';
      const infoName = dmTitle?.querySelector('infoName')?.textContent?.trim() || '';

      const dmcString = generateDmcString(dmCode);
      let displayName = '';
      if (techName) displayName += ` ${techName}`;
      if (infoName) displayName += `-${infoName}`;
      displayName = displayName.trim();

      if (dmcString) {
        results.push({
          ID: `DMC-${dmcString}`,
          CategoryId: titleText ? entryId : parentId,
          DisplayName: displayName || dmcString,
          PMEntryType: null,
          DMC: dmcString,
          AddedNew: false,
          dmIdUpissued: false,
          dmId: 0,
          pmId: 0,
          expanded: false,
          Type: 1, // Data Module
          dmRef: {
            DmRefIdent: {
              DmCode: dmCode ? {
                ModelIdentCode: dmCode.getAttribute('modelIdentCode') || '',
                SystemDiffCode: dmCode.getAttribute('systemDiffCode') || '',
                SystemCode: dmCode.getAttribute('systemCode') || '',
                SubSystemCode: dmCode.getAttribute('subSystemCode') || '',
                SubSubSystemCode: dmCode.getAttribute('subSubSystemCode') || '',
                AssyCode: dmCode.getAttribute('assyCode') || '',
                DisassyCode: dmCode.getAttribute('disassyCode') || '',
                DisassyCodeVariant: dmCode.getAttribute('disassyCodeVariant') || '',
                InfoCode: dmCode.getAttribute('infoCode') || '',
                InfoCodeVariant: dmCode.getAttribute('infoCodeVariant') || '',
                ItemLocationCode: dmCode.getAttribute('itemLocationCode') || ''
              } : null,
              IssueInfo: issueInfo ? {
                IssueNumber: issueInfo.getAttribute('issueNumber') || '',
                InWork: issueInfo.getAttribute('inWork') || ''
              } : null,
              Language: language ? {
                CountryIsoCode: language.getAttribute('countryIsoCode') || '',
                LanguageIsoCode: language.getAttribute('languageIsoCode') || ''
              } : null
            },
            DmRefAddressItems: {
              DmTitle: {
                TechName: techName ? { Text: techName } : null,
                InfoName: infoName ? { Text: infoName } : null
              },
              IssueDate: null
            },
            ApplicRefId: null
          },
          pmRefs: null,
          Children: []
        });
      }
    });

    return results;
  };

  // Build tree structure from flat array
  const buildTree = (flatArray) => {
    const idMap = new Map();
    const roots = [];

    // First pass: create map
    flatArray.forEach(item => {
      idMap.set(item.ID, { ...item, Children: [] });
    });

    // Second pass: build tree
    flatArray.forEach(item => {
      const node = idMap.get(item.ID);
      if (item.CategoryId && idMap.has(item.CategoryId)) {
        idMap.get(item.CategoryId).Children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  // Transform XML to TOC using backend Saxon API
  const transformToToc = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setProgress(10);
    setError('');

    try {
      setProgress(30);

      // Convert files to ArrayBuffer format for IPC
      const fileData = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          data: await file.arrayBuffer()
        }))
      );

      setProgress(50);

      // Call IPC
      const result = await window.electronAPI.pmToToc(fileData);

      setProgress(80);

      if (result.success) {
        // Download ZIP file automatically
        const blob = new Blob([result.data], { type: 'application/zip' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'toc_files.zip';
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);

        // Set a simple message for preview
        const message = `Successfully generated TOC for ${result.filesProcessed} file(s) (${result.filesSucceeded} succeeded).\nDownloaded as toc_files.zip`;
        setGeneratedJs(message);
        setTocData([]);

        setProgress(100);
        setShowPreview(true);
      } else {
        throw new Error(result.error || 'Transformation failed');
      }

    } catch (err) {
      const errorMsg = err.message || 'Failed to transform XML';
      setError(errorMsg);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProgress(0), 500);
    }
  };

  // Download JS file
  const downloadJs = () => {
    if (!generatedJs) return;

    const blob = new Blob([generatedJs], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Toc.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Copy to clipboard
  const copyJs = async () => {
    if (!generatedJs) return;
    try {
      await navigator.clipboard.writeText(generatedJs);
      alert('Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
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
    setPanelWidth(Math.min(Math.max(newWidth, 300), 700));
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
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
            <h1 className="text-xl font-bold flex items-center gap-2">
              <List className="h-5 w-5" />
              TOC Builder
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">
              {files.length} XML File(s)
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Panel - File List */}
        <div className="flex-1 border-r border-gray-700 flex flex-col min-w-[300px]">
          {/* Toolbar */}
          <div className="bg-gray-800 px-4 py-3 border-b border-gray-700">
            <div className="flex flex-wrap gap-2">
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
                Add PM XML Files
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={clearFiles}
                disabled={files.length === 0}
                className="bg-red-900 border-red-800 hover:bg-red-800 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            </div>
          </div>

          {/* File List */}
          <div className="flex-1 overflow-auto p-4">
            {files.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Upload className="h-16 w-16 mb-4" />
                <p className="text-lg font-medium">No Files Added</p>
                <p className="text-sm mt-2">Add PM XML files to generate TOC</p>
              </div>
            ) : (
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg"
                  >
                    <FileText className="h-5 w-5 text-blue-400" />
                    <span className="flex-1 text-sm truncate">{file.name}</span>
                    <span className="text-xs text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFile(index)}
                      className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {progress > 0 && (
            <div className="px-4 pb-4">
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {error && (
            <div className="px-4 pb-4">
              <div className="p-3 bg-red-900/50 border border-red-700 rounded text-red-200 text-sm">
                {error}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="bg-gray-800 border-t border-gray-700 px-4 py-4">
            <div className="flex gap-3">
              <Button
                onClick={transformToToc}
                disabled={files.length === 0 || isProcessing}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isProcessing ? 'Processing...' : 'Generate TOC'}
              </Button>
              <Button
                onClick={() => setShowPreview(true)}
                disabled={!generatedJs}
                variant="outline"
                className="bg-gray-700 border-gray-600"
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button
                onClick={downloadJs}
                disabled={!generatedJs}
                variant="outline"
                className="bg-green-900 border-green-800 hover:bg-green-800"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
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

        {/* Right Panel - Preview */}
        <div
          className="flex flex-col bg-gray-900"
          style={{ width: `${panelWidth}px`, minWidth: '300px', maxWidth: '700px' }}
        >
          <div className="bg-gray-800 px-4 py-3 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="font-medium flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </h3>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={previewMode === 'tree' ? 'default' : 'ghost'}
                  onClick={() => setPreviewMode('tree')}
                  className="h-7 px-2 text-xs"
                >
                  Tree
                </Button>
                <Button
                  size="sm"
                  variant={previewMode === 'code' ? 'default' : 'ghost'}
                  onClick={() => setPreviewMode('code')}
                  className="h-7 px-2 text-xs"
                >
                  Code
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {!generatedJs ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <List className="h-12 w-12 mb-4" />
                <p className="text-sm">Generate TOC to see preview</p>
              </div>
            ) : previewMode === 'tree' ? (
              <div className="bg-gray-800 rounded-lg p-2">
                {tocData.map((node, idx) => (
                  <TocTreeNode key={node.ID || idx} node={node} />
                ))}
              </div>
            ) : (
              <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap break-all">
                {generatedJs}
              </pre>
            )}
          </div>

          {generatedJs && (
            <div className="bg-gray-800 border-t border-gray-700 px-4 py-3">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyJs}
                  className="flex-1"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={downloadJs}
                  className="flex-1 bg-green-900 border-green-800"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>


    </div>
  );
};

export default TocBuilderPage;
