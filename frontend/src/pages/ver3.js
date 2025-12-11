/**
 * DM Code Generator - Refactored Logic with Final Nesting and Toggle Fix
 * Version: 2.6 - FINAL STABLE
 * Description: Corrects the renderChildren function to use the correct data level,
 * fixing the infinite expansion and collapse bug permanently.
 */

document.addEventListener('DOMContentLoaded', () => {

    // --- GLOBAL STATE VARIABLES ---
    let fullSystemData = [];
    let debounceTimer;
    let selectedSystemCode = '';
    let selectedSubsystemCode = '';
    let allInfoCodes = [];
    let selectedBaseInfoCode = '';

    // --- DOM ELEMENT REFERENCES ---
    const modelInput = document.getElementById("modelInput");
    const sdcInput = document.getElementById("sdcInput");
    const dmvInput = document.getElementById("dmvInput");
    const unitCountInput = document.getElementById("unitCountInput");
    const infoCodeVariantInput = document.getElementById("infoCodeVariantInput");
    const jsonSelector = document.getElementById('jsonSelector');
    const systemTreeContainer = document.getElementById('systemTree');
    const systemSearchInput = document.getElementById('system-search-input');
    const selectedSystemDisplay = document.getElementById('selectedSystemDisplay');
    const selectedSystemText = document.getElementById('selectedSystemText');
    const dcTableBody = document.querySelector("#dcTable tbody");
    const dmCodeResult = document.getElementById("dmCodeResult");
    const downloadButtonsContainer = document.getElementById("downloadButtons");
    const downloadAllBtn = document.getElementById("downloadAllBtn");
    const infoCodeSearchInput = document.getElementById("infoCodeSearch");
    const infoCodeResultsBody = document.querySelector('#infoCodeResults tbody');
    const selectedInfoDisplay = document.getElementById("selectedInfoCodeDisplay");

    // =================================================================================
    // SECTION 1: SYSTEM HIERARCHY (TREE) LOGIC - FINAL CORRECTED VERSION
    // =================================================================================

    const hierarchyLevels = { 'group': 0, 'system': 1, 'subsystem': 2 };

    function createTreeItem(data, level, query = '') {
        const item = document.createElement('div');
        item.className = `tree-item ${level}`;
        item.innerHTML = `<span class="expand-icon"></span><span class="item-text">${highlight(data.label, query)}</span>`;
        item.title = data.definition;
        item.dataset.level = level;
        item.dataset.code = data.code;
        item.dataset.systemCode = data.systemCode;
        item.dataset.subsystemCode = data.subsystemCode;
        item.dataset.fullCode = data.fullCode;
        item.dataset.titleText = data.title;
        return item;
    }

    function buildTree(data, query = '') {
        systemTreeContainer.innerHTML = '';
        if (!data || data.length === 0) {
            systemTreeContainer.innerHTML = query ?
                `<div class="info-message">No results found for "${query}"</div>` :
                `<div class="info-message">Select a data source to load the hierarchy.</div>`;
            return;
        }
        data.forEach(groupData => {
            const groupItem = createTreeItem(groupData, 'group', query);
            const hasChildren = groupData.children && groupData.children.length > 0;
            groupItem.classList.add(hasChildren ? (query ? 'expanded' : 'collapsed') : 'leaf');
            groupItem.addEventListener('click', (e) => {
                e.stopPropagation();
                if (hasChildren) toggleExpand(groupItem, groupData);
            });
            systemTreeContainer.appendChild(groupItem);
            if (query && hasChildren) {
                renderChildren(groupItem, groupData, query);
            }
        });
    }

    /**
     * *** FULLY CORRECTED FUNCTION ***
     * No longer guesses the child level; uses the correct level from the data.
     */
    function renderChildren(parentItem, parentData, query = '') {
        const childrenData = parentData.children || [];

        [...childrenData].reverse().forEach(childData => {
            // ** THE FIX IS HERE **
            // The 'childData.level' property already knows if it's a 'system' or 'subsystem'.
            // The old buggy line that tried to guess the level has been removed.
            const childItem = createTreeItem(childData, childData.level, query);

            const hasChildren = childData.children && childData.children.length > 0;
            childItem.classList.add(hasChildren ? (query ? 'expanded' : 'collapsed') : 'leaf');

            childItem.addEventListener('click', (e) => {
                e.stopPropagation();
                if (hasChildren) {
                    toggleExpand(childItem, childData);
                } else {
                    selectSystem(childItem);
                }
            });
            parentItem.insertAdjacentElement('afterend', childItem);
            if (query && hasChildren) {
                renderChildren(childItem, childData, query);
            }
        });
    }

    function toggleExpand(item, data) {
        const isExpanded = item.classList.contains('expanded');

        if (isExpanded) {
            item.classList.replace('expanded', 'collapsed');
            let next = item.nextElementSibling;
            const currentLevelIndex = hierarchyLevels[item.dataset.level];

            while (next) {
                const nextLevelIndex = hierarchyLevels[next.dataset.level];
                if (nextLevelIndex > currentLevelIndex) {
                    const toRemove = next;
                    next = next.nextElementSibling;
                    toRemove.remove();
                } else {
                    break;
                }
            }
        } else {
            item.classList.replace('collapsed', 'expanded');
            renderChildren(item, data);
        }
    }

    function selectSystem(item) {
        document.querySelectorAll('.tree-item.selected').forEach(el => el.classList.remove('selected'));
        item.classList.add('selected');
        selectedSystemCode = item.dataset.systemCode;
        selectedSubsystemCode = item.dataset.subsystemCode || '00';
        selectedSystemText.textContent = `${item.dataset.fullCode} - ${item.dataset.titleText}`;
        selectedSystemDisplay.style.display = 'block';
        updateResult();
    }

    // =================================================================================
    // SECTION 2: INFO CODES LOGIC
    // =================================================================================
    async function initializeInfoCodes() {
        try { const response = await fetch('data/info_codes.json'); if (!response.ok) throw new Error('Network response failed.'); allInfoCodes = await response.json(); infoCodeResultsBody.innerHTML = `<tr><td colspan="3" class="info-message">Start typing above to search codes.</td></tr>`; } catch (error) { console.error('Error loading info_codes.json:', error); infoCodeResultsBody.innerHTML = `<tr><td colspan="3" class="error-message">Could not load info codes.</td></tr>`; }
    }
    function renderInfoCodes(codes) {
        infoCodeResultsBody.innerHTML = ""; if (codes.length === 0) { infoCodeResultsBody.innerHTML = `<tr><td colspan="3" class="info-message">No results found.</td></tr>`; return; } codes.forEach(entry => { const row = document.createElement("tr"); row.innerHTML = `<td>${entry.code}</td><td>${entry.type}</td><td>${entry.title}</td>`; row.addEventListener("click", () => handleInfoCodeSelection(entry)); infoCodeResultsBody.appendChild(row); });
    }
    function handleInfoCodeSelection(code) {
        selectedBaseInfoCode = code.code; selectedInfoDisplay.textContent = `Selected Base: ${code.code} - ${code.title}`; selectedInfoDisplay.style.display = 'block'; updateResult();
    }
    function handleInfoCodeSearch() {
        const query = infoCodeSearchInput.value.toLowerCase().trim(); if (!query) { infoCodeResultsBody.innerHTML = `<tr><td colspan="3" class="info-message">Start typing above to search codes.</td></tr>`; return; } const filtered = allInfoCodes.filter(entry => entry.code.toLowerCase().includes(query) || entry.type.toLowerCase().includes(query) || entry.title.toLowerCase().includes(query)); renderInfoCodes(filtered);
    }

    // =================================================================================
    // SECTION 3: DMCODE GENERATION & UI UPDATES
    // =================================================================================
    function updateDcTable() {
        const unitCount = parseInt(unitCountInput.value) || 0; dcTableBody.innerHTML = ""; if (unitCount <= 0) { const row = dcTableBody.insertRow(); row.innerHTML = `<td>00</td><td><input type="text" maxlength="2" data-unit="0" placeholder="e.g., 00"></td>`; } else { for (let i = 1; i <= unitCount; i++) { const unitCode = String(i).padStart(2, '0'); const row = dcTableBody.insertRow(); row.innerHTML = `<td>${unitCode}</td><td><input type="text" maxlength="2" data-unit="${i}" placeholder="e.g., 00"></td>`; } } dcTableBody.querySelectorAll('input').forEach(input => { input.addEventListener('input', updateResult); });
    }
    function updateResult() {
        const model = modelInput.value.trim(); const sdc = sdcInput.value.trim(); const dmv = dmvInput.value.trim(); const unitCount = parseInt(unitCountInput.value) || 0; const infoCodeVariant = infoCodeVariantInput.value.trim(); const finalInfoCode = selectedBaseInfoCode ? `${selectedBaseInfoCode}${infoCodeVariant}` : "000"; if (!model || !sdc || !selectedSystemCode || dmv.length > 1) { dmCodeResult.textContent = ''; renderDownloadButtons([]); return; } const combinedSystemCode = `${selectedSystemCode}-${selectedSubsystemCode}`; const itemLocationCode = "D"; const codes = []; if (unitCount <= 0) { const dcInput = dcTableBody.querySelector(`input[data-unit="0"]`); const dcCode = (dcInput ? dcInput.value.trim() : "00").padStart(2, '0'); const fullCode = `${model}-${sdc}-${combinedSystemCode}-00-${dcCode}${dmv}-${finalInfoCode}-${itemLocationCode}`; codes.push(fullCode); } else { for (let i = 1; i <= unitCount; i++) { const unitCode = String(i).padStart(2, '0'); const dcInput = dcTableBody.querySelector(`input[data-unit="${i}"]`); const dcCode = (dcInput ? dcInput.value.trim() : "00").padStart(2, '0'); const fullCode = `${model}-${sdc}-${combinedSystemCode}-${unitCode}-${dcCode}${dmv}-${finalInfoCode}-${itemLocationCode}`; codes.push(fullCode); } } dmCodeResult.innerHTML = codes.map(code => `<div>${code}</div>`).join(''); renderDownloadButtons(codes);
    }

    // =================================================================================
    // SECTION 4: DATA LOADING & TRANSFORMATION
    // =================================================================================
    function loadSystemData(filename) {
        if (!filename) return; systemTreeContainer.innerHTML = '<div class="info-message">Loading data...</div>'; selectedSystemDisplay.style.display = 'none'; selectedSystemCode = ''; selectedSubsystemCode = ''; updateResult(); fetch(`data2/${filename}`).then(res => { if (!res.ok) throw new Error(`Network error loading ${filename}`); return res.json(); }).then(data => { let transformedData; if (filename.includes('Maintained SNS - Generic') || filename.includes('maintained_sns_ordanance')) { transformedData = transformLegacyGeneralData(data); } else if (filename === 'gsv.json') { transformedData = transformGSVData(data); } else if (filename === 'maintained_sns_support.json') { transformedData = transformLegacySupportData(data); } else { transformedData = transformAtaData(data); } fullSystemData = transformedData; buildTree(fullSystemData); systemSearchInput.value = ''; }).catch(err => { console.error(`Error loading ${filename}:`, err); systemTreeContainer.innerHTML = `<div class="error-message">Error loading ${filename}.</div>`; fullSystemData = []; });
    }
    function createNode(level, code, title, definition, systemCode, subsystemCode, children = []) {
        return { level, code, title, definition, children, systemCode, subsystemCode, label: `${code} - ${title}`, fullCode: systemCode && subsystemCode ? `${systemCode}-${subsystemCode}` : systemCode || code, };
    }
    function transformAtaData(rawData) {
        return rawData.filter(group => group.system_id).map(group => createNode('group', group.system_id, group.system_title, '', group.system_id, null, (group.tables || []).filter(system => system.system_code).map(system => createNode('system', system.system_code, system.title, system.definition, system.system_code, null, (system.subsystems || []).filter(sub => sub.subsystem_code).map(sub => createNode('subsystem', sub.subsystem_code, sub.title, sub.definition, system.system_code, sub.subsystem_code.replace('-', '')))))));
    }
    function transformLegacyGeneralData(rawData) {
        const topKey = Object.keys(rawData)[0]; const groupData = rawData[topKey]; const groupId = topKey.replace('=', '').trim().replace(/_/g, ' '); return [createNode('group', groupId, groupId, '', groupId, null, (groupData || []).filter(system => system.System).map(system => createNode('system', system.System, system.Title, system.Definition, system.System, null, (system.Subsystems || []).filter(sub => sub.Subsystem).map(sub => createNode('subsystem', sub.Subsystem, sub.Title, sub.Definition, system.System, sub.Subsystem.replace('-', ''))))))];
    }
    function transformGSVData(rawData) {
        return rawData.filter(group => group.system_letter).map(group => createNode('group', group.system_letter, group.system_title, '', group.system_letter, null, (group.subsystems || []).filter(system => system.system_code).map(system => createNode('system', system.system_code, system.title, system.definition, system.system_code, null, (system.sub_subsystems || []).filter(sub => sub.subsystem_code).map(sub => createNode('subsystem', sub.subsystem_code, sub.title, sub.definition, system.system_code, sub.subsystem_code.replace('-', '')))))));
    }
    function transformLegacySupportData(rawData) {
        if (!rawData || !rawData.System_categories) return []; return rawData.System_categories.filter(group => group.System).map(group => createNode('group', group.System, group.Title, '', group.System, null, (group.Subsystems || []).filter(system => system.System).map(system => createNode('system', system.System, system.Title, system.Definition, system.System, null, []))));
    }

    // =================================================================================
    // SECTION 5: UTILITIES & EVENT BINDING
    // =================================================================================
    function highlight(text, query) { if (!query || !text) return text; const regex = new RegExp(query.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi'); return text.replace(regex, match => `<span class="highlight">${match}</span>`); }
    function renderDownloadButtons(dmCodes) { downloadButtonsContainer.innerHTML = ''; if (dmCodes.length > 0) { dmCodes.forEach(code => { const btn = document.createElement("button"); btn.textContent = `Download ${code.split('-')[3]}`; btn.className = 'btn'; btn.onclick = () => generateDMDoc([code], `${code}.docx`); downloadButtonsContainer.appendChild(btn); }); } downloadAllBtn.disabled = dmCodes.length <= 1; }
    function generateDMDoc(dmCodes, fileName) { const { Document, Packer, Paragraph } = window.docx; const doc = new Document({ sections: [{ children: dmCodes.map(code => new Paragraph(code)) }] }); Packer.toBlob(doc).then(blob => { saveAs(blob, fileName); }); }
    function filterSystemData(query) {
        query = query.trim().toLowerCase(); if (!query) return fullSystemData; function filterNodes(nodes) { return nodes.map(node => { const selfMatch = node.label.toLowerCase().includes(query); const filteredChildren = node.children ? filterNodes(node.children) : []; if (selfMatch || filteredChildren.length > 0) { return { ...node, children: selfMatch ? node.children : filteredChildren }; } return null; }).filter(Boolean); } return filterNodes(fullSystemData);
    }
    function initialize() {
        jsonSelector.addEventListener('change', (e) => loadSystemData(e.target.value)); systemSearchInput.addEventListener('input', () => { clearTimeout(debounceTimer); debounceTimer = setTimeout(() => buildTree(filterSystemData(systemSearchInput.value), systemSearchInput.value), 250); }); infoCodeSearchInput.addEventListener('input', handleInfoCodeSearch);[modelInput, sdcInput, dmvInput, infoCodeVariantInput].forEach(el => { el.addEventListener("input", updateResult); }); unitCountInput.addEventListener('input', () => { updateDcTable(); updateResult(); }); downloadAllBtn.onclick = () => { const codes = Array.from(dmCodeResult.querySelectorAll('div')).map(div => div.textContent); codes.forEach(code => generateDMDoc([code], `${code}.docx`)); }; updateDcTable(); initializeInfoCodes(); buildTree([]);
    }

    initialize();
});