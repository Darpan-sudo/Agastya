<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:xlink="http://www.w3.org/1999/xlink"
                version="1.0">
    <xsl:output method="html" doctype-system="about:legacy-compat" encoding="UTF-8" indent="yes"/>
    <!-- Parameters -->
    <xsl:param name="numbered-titles" select="false()"/>
    <xsl:param name="show-references-table" select="true()"/>
    <xsl:param name="reference-resolver" select="false()"/>
    <xsl:param name="extra-header-tags" select="false()"/>
    <xsl:param name="bootstrap-css-path" select="'xignal/assets/bootstrap/4.6.2/css/bootstrap.min.css'"/>
    <xsl:param name="custom-css-path" select="'../main.css'"/>
    <xsl:param name="jquery-js-path" select="'xignal/assets/jquery/3.7.1/jquery-slim-min.js'"/>
    <xsl:param name="bootstrap-js-path" select="'xignal/assets/bootstrap/4.6.2/js/bootstrap.min.js'"/>
    <xsl:param name="applic-js-path" select="'../js/applic.js'"/>
    <xsl:param name="csdb-path" select="'csdb/'"/>
    <xsl:key name="ids" match="*[@id]" use="@id"/>
    <!-- Helper templates for applicability (from new version) -->
    <xsl:template name="generate-applic-string">
        <xsl:param name="applicNode" select="."/>
        <xsl:if test="$applicNode/*[local-name()='evaluate']">
            <xsl:variable name="eval" select="$applicNode/*[local-name()='evaluate'][1]"/>
            <xsl:value-of select="translate($eval/@andOr, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')"/>
            <xsl:for-each select="$eval/*[local-name()='assert']">
                <xsl:text>;</xsl:text>
                <xsl:value-of select="@applicPropertyIdent"/>
                <xsl:text>=</xsl:text>
                <xsl:value-of select="@applicPropertyValues"/>
            </xsl:for-each>
        </xsl:if>
    </xsl:template>
    <xsl:template name="get-product-display-text">
        <xsl:param name="applicNode" />
        <xsl:choose>
            <xsl:when test="$applicNode/*[local-name()='displayText']/*[local-name()='simplePara']">
                <xsl:value-of select="$applicNode/*[local-name()='displayText']/*[local-name()='simplePara']"/>
            </xsl:when>
            <xsl:otherwise>
                <xsl:for-each select="$applicNode/*[local-name()='evaluate']/*[local-name()='assert']">
                    <xsl:value-of select="@applicPropertyIdent"/>:
                    <xsl:value-of select="@applicPropertyValues"/>
                    <xsl:if test="position() != last()">
                        <xsl:text>, </xsl:text>
                    </xsl:if>
                </xsl:for-each>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    <xsl:template name="add-applic-attribute">
        <xsl:if test="*[local-name()='applic']">
            <xsl:attribute name="data-applic">
                <xsl:call-template name="generate-applic-string">
                    <xsl:with-param name="applicNode" select="*[local-name()='applic']"/>
                </xsl:call-template>
            </xsl:attribute>
        </xsl:if>
    </xsl:template>
    <!-- Root Template -->
    <xsl:template match="/">
        <html lang="en">
            <head>
                <meta charset="UTF-8"/>
                <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
                <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
                <title>
                    <xsl:apply-templates select="//*[local-name()='identAndStatusSection']//*[local-name()='dmTitle']"/>
                </title>
                <link rel="stylesheet" href="{$bootstrap-css-path}" />
                <xsl:if test="$custom-css-path != ''">
                    <link rel="stylesheet" href="{$custom-css-path}" />
                </xsl:if>
                <style>
                    .prelim-req-table { margin-bottom: 1.5rem; }
                    .fault-procedure-list { margin-top: 2rem; padding-left: 1rem; }
                    [id] { scroll-margin-top: 70px; }
                    .hidden-by-applic { display: none !important; }
                    .para0Indent { width: 40px; flex-shrink: 0; }
                </style>
            </head>
            <body>
                <xsl:choose>
                    <xsl:when test="/*[local-name()='dmodule']">
                        <xsl:apply-templates select="/*[local-name()='dmodule']/*[local-name()='identAndStatusSection']" mode="page-setup"/>
                        <div id="s1000d-content">
                            <xsl:apply-templates select="/*[local-name()='dmodule']/*[local-name()='content']"/>
                        </div>
                        <script src="{$jquery-js-path}"></script>
                        <script src="{$bootstrap-js-path}"></script>
                        <script src="{$applic-js-path}"></script>
                    </xsl:when>
                    <xsl:when test="/*[local-name()='preliminaryRqmts']">
                        <div class="container-fluid">
                            <xsl:apply-templates select="."/>
                        </div>
                        <script src="{$jquery-js-path}"></script>
                        <script src="{$bootstrap-js-path}"></script>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:apply-templates/>
                    </xsl:otherwise>
                </xsl:choose>
            </body>
        </html>
    </xsl:template>
    <!-- Page Setup (from new version) -->
    <xsl:template match="*[local-name()='identAndStatusSection']" mode="page-setup">
        <xsl:call-template name="generate-title-bar">
            <xsl:with-param name="identSection" select="."/>
        </xsl:call-template>
        <div class="container-fluid idstatusTitle">
            <button type="button" class="btn btn-primary mt-1 mb-3" data-toggle="modal" data-target="#idstatusModal">View Identification and Status</button>
        </div>
        <xsl:call-template name="generate-id-status-modal">
            <xsl:with-param name="identSection" select="."/>
        </xsl:call-template>
        <xsl:variable name="all_references_in_dm" select="ancestor::*[local-name()='dmodule'][1]//*[local-name()='dmRef' or local-name()='externalPubRef' or local-name()='pmRef'][ancestor::*[local-name()='content'] or ancestor::*[local-name()='refs']]"/>
        <xsl:if test="$show-references-table">
            <div class="container-fluid">
                <h2 id="tblReferences" class="ps-Title_font ps-Title_2 ps-Title_color">References</h2>
                <table class="tblReferences mb-5 table table-borderless prelim-req-table s1000d-table">
                    <caption class="italic spaceAfter-sm s1000d-table-title">Table 1 References</caption>
                    <thead>
                        <tr>
                            <th>Data module/Technical publication</th>
                            <th>Title</th>
                        </tr>
                    </thead>
                    <tbody>
                        <xsl:choose>
                            <xsl:when test="$all_references_in_dm">
                                <xsl:apply-templates select="$all_references_in_dm" mode="refs"/>
                            </xsl:when>
                            <xsl:otherwise>
                                <tr>
                                    <td colspan="2" class="text-center">None</td>
                                </tr>
                            </xsl:otherwise>
                        </xsl:choose>
                    </tbody>
                </table>
            </div>
        </xsl:if>
    </xsl:template>
    <!-- Content processing -->
    <xsl:template match="*[local-name()='content']">
        <div class="container-fluid">
            <xsl:apply-templates select="*[local-name()='description'] | *[local-name()='procedure'] | *[local-name()='faultIsolation'] | *[local-name()='preliminaryRqmts'] | *[local-name()='illustratedPartsCatalog']"/>
        </div>
    </xsl:template>
    <!-- IPD (Illustrated Parts Data) TEMPLATES -->
    <xsl:template match="*[local-name()='illustratedPartsCatalog']">
        <xsl:apply-templates select="*[local-name()='figure']"/>
        <div class="container-fluid">
            <div class="row">
                <div class="col-md-12">
                    <h3>Catalog sequence numbers</h3>
                    <table class="ipdTbl table table-hover table-borderless">
                        <thead>
                            <tr>
                                <th>Fig</th>
                                <th>Item</th>
                                <th>Units per assembly / Unit of issue</th>
                                <th>CAGE</th>
                                <th>Part No.
                                    <br/>NATO Stock No.
                                </th>
                                <th class="description-cell">Description</th>
                                <th>
                                    <span style="font-size:8px;">🞷</span> Usable on
                                    <br/>code assy
                                    <br/>• MV/ Effect
                                </th>
                                <th>ICY</th>
                            </tr>
                        </thead>
                        <tbody>
                            <xsl:apply-templates select="*[local-name()='catalogSeqNumber']"/>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </xsl:template>
    <xsl:template match="*[local-name()='illustratedPartsCatalog']/*[local-name()='figure']">
        <div class="container-fluid">
            <div class="row">
                <div class="col-md-12">
                    <h2>Illustrated Parts Data (IPD)</h2>
                    <div class="text-center font-italic mt-2 mb-1">
                        Fig
                        <xsl:number count="figure" level="any"/>&#160;
                        <xsl:value-of select="title"/>
                    </div>
                    <div class="text-center">
                        <xsl:for-each select="graphic">
                            <span class="font-italic">Sheet
                                <xsl:value-of select="position()"/> of
                                <xsl:value-of select="last()"/>
                            </span>
                            <div class="container-fluid m-0 pb-4">
                                <xsl:apply-templates select="."/>
                                <button class="btn btn-sm btn-secondary mb-1 icn-link">View</button>
                                <!-- <br/> -->
                                <div class="icn mb-2">
                                    <xsl:value-of select="@infoEntityIdent"/>
                                </div>
                            </div>
                        </xsl:for-each>
                    </div>
                </div>
            </div>
        </div>
    </xsl:template>
    <xsl:template match="*[local-name()='catalogSeqNumber']">
        <xsl:for-each select="*[local-name()='itemSeqNumber']">
            <tr>
                <td>
                    <xsl:if test="position() = 1">
                        <xsl:value-of select="../@figureNumber"/>
                    </xsl:if>
                </td>
                <td>
                    <xsl:if test="position() = 1">
                        <xsl:value-of select="../@item"/>
                    </xsl:if>
                </td>
                <td>
                    <xsl:value-of select="*[local-name()='quantityPerNextHigherAssy']"/>
                </td>
                <td>
                    <xsl:value-of select="*[local-name()='partRef']/@manufacturerCodeValue"/>
                </td>
                <td>
                    <xsl:value-of select="*[local-name()='partRef']/@partNumberValue"/>
                </td>
                <td class="description-cell">
                    <xsl:if test="../@indenture > 1">
                        <xsl:text>• </xsl:text>
                    </xsl:if>
                    <xsl:value-of select="*[local-name()='partSegment']/*[local-name()='itemIdentData']/*[local-name()='descrForPart']"/>
                </td>
                <td></td>
                <td></td>
            </tr>
        </xsl:for-each>
    </xsl:template>
    <!-- Standard Content Templates -->
    <xsl:template match="*[local-name()='description'] | *[local-name()='procedure']">
        <xsl:call-template name="add-applic-attribute"/>
        <xsl:apply-templates/>
    </xsl:template>
    <xsl:template match="*[local-name()='description']/*[local-name()='title'] | *[local-name()='procedure']/*[local-name()='title']">
        <div class="row">
            <div class="col-md-12 mainDoctypeTitle">
                <h2 id="{generate-id()}">
                    <xsl:apply-templates/>
                </h2>
            </div>
        </div>
    </xsl:template>
    <xsl:template match="*[local-name()='levelledPara']">
        <div class="row">
            <div class="col-12">
                <div class="levelOneBar mb-3 rounded">
                    <xsl:call-template name="add-applic-attribute"/>
                    <div class="d-flex">
                        <div class="roundedBullet">
                            <xsl:number level="multiple" count="*[local-name()='levelledPara']" format="1.1"/>
                        </div>
                        <xsl:if test="*[local-name()='title']">
                            <div class="para0Title">
                                <span class="text-decoration-underline">
                                    <xsl:apply-templates select="*[local-name()='title']" mode="inline"/>
                                </span>
                            </div>
                        </xsl:if>
                    </div>
                    <xsl:apply-templates select="*[local-name()='para'] | *[local-name()='figure'] | *[local-name()='note'] | *[local-name()='seqList'] | *[local-name()='randomList'] | *[local-name()='table'] | *[local-name()='levelledPara']"/>
                </div>
            </div>
        </div>
    </xsl:template>
    <xsl:template match="*[local-name()='levelledPara']/*[local-name()='title']" mode="inline">
        <xsl:apply-templates/>
    </xsl:template>
    <xsl:template match="*[local-name()='externalPubRef']">
        <a target="_blank" rel="noopener noreferrer">
            <xsl:attribute name="href">
                <xsl:value-of select="@xlink:href"/>
            </xsl:attribute>
            <xsl:apply-templates select=".//*[local-name()='externalPubTitle'] | .//*[local-name()='externalPubCode']"/>
        </a>
    </xsl:template>
    <xsl:template match="*[local-name()='para']">
        <xsl:choose>
            <xsl:when test="parent::*[local-name()='listItem']">
                <span id="{@id}" class="m-0 pb-2">
                    <xsl:apply-templates/>
                </span>
            </xsl:when>
            <xsl:when test="parent::*[local-name()='levelledPara'] | parent::*[local-name()='note']">
                <div class="d-flex">
                    <xsl:call-template name="add-applic-attribute"/>
                    <div class="para0Indent"/>
                    <div class="para0TextDescription flex-grow-1 pb-3">
                        <span  id="{@id}" class="m-0 pb-2">
                            <xsl:apply-templates/>
                        </span>
                    </div>
                </div>
            </xsl:when>
            <xsl:when test="parent::*[local-name()='listItemDefinition']">
                <dd>
                    <xsl:call-template name="add-applic-attribute"/>
                    <xsl:apply-templates/>
                </dd>
            </xsl:when>
            <xsl:otherwise>
                <div class="row">
                    <div class="col-12">
                        <p>
                            <xsl:call-template name="add-applic-attribute"/>
                            <xsl:apply-templates/>
                        </p>
                    </div>
                </div>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    <xsl:template match="*[local-name()='sequentialList'] | *[local-name()='seqList']">
        <div class="d-flex">
            <xsl:call-template name="add-applic-attribute"/>
            <div class="para0TextDescription flex-grow-1 pb-3">
                <ol>
                    <xsl:apply-templates select="*[local-name()='listItem']"/>
                </ol>
            </div>
        </div>
    </xsl:template>
    <xsl:template match="*[local-name()='randomList']">
        <div class="d-flex">
            <xsl:call-template name="add-applic-attribute"/>
            <div class="para0TextDescription flex-grow-1 pb-3">
                <ul>
                    <xsl:apply-templates select="*[local-name()='listItem']"/>
                </ul>
            </div>
        </div>
    </xsl:template>
    <xsl:template match="*[local-name()='listItem']">
        <li class="m-0 pb-2">
            <xsl:call-template name="add-applic-attribute"/>
            <xsl:if test="position() = last()">
                <xsl:attribute name="class">m-0 pb-0</xsl:attribute>
            </xsl:if>
            <xsl:choose>
                <xsl:when test="*[local-name()='para']">
                    <xsl:apply-templates/>
                </xsl:when>
                <xsl:otherwise>
                    <span id="{@id}" class="m-0 p-0">
                        <xsl:apply-templates/>
                    </span>
                </xsl:otherwise>
            </xsl:choose>
        </li>
    </xsl:template>
    <xsl:template match="*[local-name()='note']">
        <div class="row">
            <xsl:call-template name="add-applic-attribute"/>
            <div class="col-12">
                <table class="noteBackground">
                    <tbody>
                        <tr>
                            <td class="text-center p-4">
                                <table class="noteBody">
                                    <tbody>
                                        <tr>
                                            <td class="text-center font-weight-bold p-4">
                                                <div class="h6 font-weight-bold">Note</div>
                                                <div class="font-weight-bold">
                                                    <p class="pb-0 m-0">
                                                        <xsl:apply-templates/>
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </xsl:template>
    <!-- Preliminary Requirements Templates -->
    <xsl:template match="*[local-name()='preliminaryRqmts']">
        <div class="preliminary-requirements-section mt-4 mb-4 p-3 border rounded">
            <xsl:call-template name="add-applic-attribute"/>
            <h3 id="{@id}" class="mb-3">Preliminary Requirements</h3>
            <xsl:apply-templates/>
        </div>
    </xsl:template>
    <xsl:template match="*[local-name()='reqCondGroup']">
        <div class="req-cond-group mt-3">
            <xsl:call-template name="add-applic-attribute"/>
            <h4 class="mb-2">Required Conditions</h4>
            <table class="tblReferences table-bordered table-sm table-striped prelim-req-table">
                <thead class="thead-light">
                    <tr>
                        <th>Action / Condition</th>
                        <th>Data Module / Technical Publication</th>
                    </tr>
                </thead>
                <tbody>
                    <xsl:choose>
                        <xsl:when test="*[local-name()='reqCondPm'] | *[local-name()='reqCondDm'] | *[local-name()='reqCondNoRef']">
                            <xsl:apply-templates/>
                        </xsl:when>
                        <xsl:otherwise>
                            <tr>
                                <td colspan="2" class="text-center">None</td>
                            </tr>
                        </xsl:otherwise>
                    </xsl:choose>
                </tbody>
            </table>
        </div>
    </xsl:template>
    <xsl:template match="*[local-name()='reqPersons']">
        <div class="req-persons mt-3">
            <xsl:call-template name="add-applic-attribute"/>
            <h4 class="mb-2">Required Personnel</h4>
            <table class="tblReferences table-bordered table-sm table-striped prelim-req-table">
                <thead class="thead-light">
                    <tr>
                        <th>Persons</th>
                        <th>Category</th>
                        <th>Skill Level</th>
                        <th>Trade</th>
                        <th>Est. Time</th>
                    </tr>
                </thead>
                <tbody>
                    <xsl:choose>
                        <xsl:when test="*[local-name()='person']">
                            <xsl:apply-templates/>
                        </xsl:when>
                        <xsl:otherwise>
                            <tr>
                                <td colspan="5" class="text-center">None</td>
                            </tr>
                        </xsl:otherwise>
                    </xsl:choose>
                </tbody>
            </table>
        </div>
    </xsl:template>
    <xsl:template match="*[local-name()='reqSupportEquips'] | *[local-name()='reqSupplies'] | *[local-name()='reqSpares']">
        <div class="mt-3">
            <xsl:call-template name="add-applic-attribute"/>
            <h4 id="{@id}" class="mb-2">
                <xsl:choose>
                    <xsl:when test="local-name()='reqSupportEquips'">Support Equipment</xsl:when>
                    <xsl:when test="local-name()='reqSupplies'">Consumables, materials and expendables</xsl:when>
                    <xsl:when test="local-name()='reqSpares'">Spares</xsl:when>
                </xsl:choose>
            </h4>
            <xsl:apply-templates select="*"/>
        </div>
    </xsl:template>
    <xsl:template match="*[local-name()='supportEquipDescrGroup'] | *[local-name()='supplyDescrGroup'] | *[local-name()='spareDescrGroup']">
        <table class="tblReferences table-bordered table-sm table-striped prelim-req-table">
            <xsl:call-template name="add-applic-attribute"/>
            <thead class="thead-light">
                <tr>
                    <th>Name</th>
                    <th>Manufacturer / Part No.</th>
                    <th>Quantity</th>
                    <th>Remark</th>
                </tr>
            </thead>
            <tbody>
                <xsl:choose>
                    <xsl:when test="*[local-name()='supportEquipDescr'] | *[local-name()='supplyDescr'] | *[local-name()='spareDescr']">
                        <xsl:apply-templates/>
                    </xsl:when>
                    <xsl:otherwise>
                        <tr>
                            <td colspan="4" class="text-center">None</td>
                        </tr>
                    </xsl:otherwise>
                </xsl:choose>
            </tbody>
        </table>
    </xsl:template>
    <xsl:template match="*[local-name()='reqSupportEquips']/*[not(local-name()='supportEquipDescrGroup')] | *[local-name()='reqSupplies']/*[not(local-name()='supplyDescrGroup')] | *[local-name()='reqSpares']/*[not(local-name()='spareDescrGroup')]">
        <table class="tblReferences table-bordered table-sm table-striped prelim-req-table">
            <thead class="thead-light">
                <tr>
                    <th>Name</th>
                    <th>Manufacturer / Part No.</th>
                    <th>Quantity</th>
                    <th>Remark</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td colspan="4" class="text-center">None</td>
                </tr>
            </tbody>
        </table>
    </xsl:template>
    <xsl:template match="*[local-name()='reqSafety']">
        <div class="req-safety mt-3">
            <xsl:call-template name="add-applic-attribute"/>
            <h4 id="{@id}" class="mb-2">Safety Requirements</h4>
            <xsl:choose>
                <xsl:when test="*[local-name()='safetyRqmts']/*">
                    <xsl:apply-templates/>
                </xsl:when>
                <xsl:otherwise>
                    <p>None</p>
                </xsl:otherwise>
            </xsl:choose>
        </div>
    </xsl:template>
    <xsl:template match="*[local-name()='supportEquipDescr'] | *[local-name()='supplyDescr'] | *[local-name()='spareDescr']">
        <tr>
            <xsl:call-template name="add-applic-attribute"/>
            <td>
                <xsl:value-of select="*[local-name()='name']"/>
            </td>
            <td>
                <xsl:value-of select="*[local-name()='identNumber']/*[local-name()='manufacturerCode']"/>
                <xsl:if test="*[local-name()='identNumber']/*[local-name()='manufacturerCode'] and *[local-name()='identNumber']/*[local-name()='partAndSerialNumber']/*[local-name()='partNumber']"> / </xsl:if>
                <xsl:value-of select="*[local-name()='identNumber']/*[local-name()='partAndSerialNumber']/*[local-name()='partNumber']"/>
            </td>
            <td>
                <xsl:value-of select="*[local-name()='reqQuantity']"/>
                <xsl:if test="local-name()='supplyDescr' and *[local-name()='reqQuantity']/@unitOfMeasure">
                    <xsl:value-of select="*[local-name()='reqQuantity']/@unitOfMeasure"/>
                </xsl:if>
            </td>
            <td>
                <xsl:apply-templates select="*[local-name()='remarks']/*[local-name()='simplePara']/node()"/>
            </td>
        </tr>
    </xsl:template>
    <xsl:template match="*[local-name()='person']">
        <tr>
            <xsl:call-template name="add-applic-attribute"/>
            <td>
                <xsl:value-of select="@man"/>
            </td>
            <td>
                <xsl:value-of select="*[local-name()='personCategory']/@personCategoryCode"/>
            </td>
            <td>
                <xsl:value-of select="*[local-name()='personSkill']/@skillLevelCode"/>
            </td>
            <td>
                <xsl:value-of select="*[local-name()='trade']"/>
            </td>
            <td>
                <xsl:value-of select="*[local-name()='estimatedTime']"/>
                <xsl:value-of select="*[local-name()='estimatedTime']/@unitOfMeasure"/>
            </td>
        </tr>
    </xsl:template>
    <xsl:template match="*[local-name()='reqCondPm'] | *[local-name()='reqCondDm'] | *[local-name()='reqCondNoRef']">
        <tr>
            <xsl:call-template name="add-applic-attribute"/>
            <td>
                <xsl:apply-templates select="*[local-name()='reqCond']/node()"/>
            </td>
            <td>
                <xsl:apply-templates select="*[local-name()='pmRef'] | *[local-name()='dmRef']"/>
                <xsl:if test="not(*[local-name()='pmRef']) and not(*[local-name()='dmRef'])">N/A</xsl:if>
            </td>
        </tr>
    </xsl:template>
    <xsl:template name="generate-id-status-modal">
        <xsl:param name="identSection"/>
        <div class="modal fade" id="idstatusModal" tabindex="-1" aria-labelledby="idstatusModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-xl modal-dialog-scrollable">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="idstatusModalLabel">Data Module Identification and Status</h5>
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">X</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="container-fluid">
                            <div class="row pb-2">
                                <div class="col-sm-3 font-weight-bold">DMC:</div>
                                <div class="col-sm-9">
                                    <xsl:apply-templates select="$identSection//*[local-name()='dmIdent']"/>
                                </div>
                            </div>
                            <div class="row pb-2">
                                <div class="col-sm-3 font-weight-bold">Language:</div>
                                <div class="col-sm-9">
                                    <xsl:apply-templates select="$identSection//*[local-name()='language']"/>
                                </div>
                            </div>
                            <div class="row pb-2">
                                <div class="col-sm-3 font-weight-bold">Issue No.:</div>
                                <div class="col-sm-9">
                                    <xsl:value-of select="$identSection//*[local-name()='issueInfo']/@issueNumber"/> (
                                    <xsl:value-of select="$identSection//*[local-name()='issueInfo']/@inWork"/>)
                                </div>
                            </div>
                            <div class="row pb-2">
                                <div class="col-sm-3 font-weight-bold">Issue Date:</div>
                                <div class="col-sm-9">
                                    <xsl:apply-templates select="$identSection//*[local-name()='issueDate']"/>
                                </div>
                            </div>
                            <div class="row pb-2">
                                <div class="col-sm-3 font-weight-bold">Title:</div>
                                <div class="col-sm-9">
                                    <xsl:apply-templates select="$identSection//*[local-name()='dmTitle']"/>
                                </div>
                            </div>
                            <div class="row pb-2">
                                <div class="col-sm-3 font-weight-bold">Security:</div>
                                <div class="col-sm-9">
                                    <xsl:call-template name="decodeSecurity">
                                        <xsl:with-param name="code" select="$identSection/*[local-name()='dmStatus']/*[local-name()='security']/@securityClassification"/>
                                    </xsl:call-template>
                                </div>
                            </div>
                            <div class="row pb-2">
                                <div class="col-sm-3 font-weight-bold">RPC:</div>
                                <div class="col-sm-9">
                                    <xsl:apply-templates select="$identSection/*[local-name()='dmStatus']/*[local-name()='responsiblePartnerCompany']"/>
                                </div>
                            </div>
                            <div class="row pb-2">
                                <div class="col-sm-3 font-weight-bold">Originator:</div>
                                <div class="col-sm-9">
                                    <xsl:apply-templates select="$identSection/*[local-name()='dmStatus']/*[local-name()='originator']"/>
                                </div>
                            </div>
                            <div class="row pb-2">
                                <div class="col-sm-3 font-weight-bold">Applicability:</div>
                                <div class="col-sm-9">
                                    <xsl:apply-templates select="$identSection/*[local-name()='dmStatus']/*[local-name()='applic']/*[local-name()='displayText']/*[local-name()='simplePara']"/>
                                </div>
                            </div>
                            <div class="row pb-2">
                                <div class="col-sm-3 font-weight-bold">BREX:</div>
                                <div class="col-sm-9">
                                    <xsl:apply-templates select="$identSection/*[local-name()='dmStatus']/*[local-name()='brexDmRef']/*[local-name()='dmRef']"/>
                                </div>
                            </div>
                            <div class="row pb-2">
                                <div class="col-sm-3 font-weight-bold">QA:</div>
                                <div class="col-sm-9">
                                    <xsl:choose>
                                        <xsl:when test="$identSection/*[local-name()='dmStatus']/*[local-name()='qualityAssurance']/*[local-name()='unverified']">Unverified</xsl:when>
                                        <xsl:when test="$identSection/*[local-name()='dmStatus']/*[local-name()='qualityAssurance']/*[local-name()='firstVerification']">First Verification
                                            <xsl:value-of select="$identSection/*[local-name()='dmStatus']/*[local-name()='qualityAssurance']/*[local-name()='firstVerification']/@verificationType"/>
                                        </xsl:when>
                                        <xsl:otherwise>N/A</xsl:otherwise>
                                    </xsl:choose>
                                </div>
                            </div>
                            <xsl:if test="$identSection/*[local-name()='dmStatus']/*[local-name()='reasonForUpdate']">
                                <div class="row pb-2">
                                    <div class="col-sm-3 font-weight-bold">Reason for Update:</div>
                                    <div class="col-sm-9">
                                        <xsl:apply-templates select="$identSection/*[local-name()='dmStatus']/*[local-name()='reasonForUpdate']/*[local-name()='simplePara']"/>
                                    </div>
                                </div>
                            </xsl:if>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </xsl:template>
    <xsl:template name="generate-title-bar">
        <xsl:param name="identSection"/>
        <div class="dmTitleBar bg-light p-3 mb-3">
            <h1 class="text-center">
                <xsl:apply-templates select="$identSection//*[local-name()='dmTitle']"/>
            </h1>
        </div>
    </xsl:template>
    <xsl:template match="*[local-name()='simplePara']">
        <p>
            <xsl:call-template name="add-applic-attribute"/>
            <xsl:apply-templates/>
        </p>
    </xsl:template>
    <xsl:template name="decodeSecurity">
        <xsl:param name="code"/>
        <xsl:choose>
            <xsl:when test="$code = '01'">Unclassified</xsl:when>
            <xsl:when test="$code = '02'">Restricted</xsl:when>
            <xsl:when test="$code = '03'">Confidential</xsl:when>
            <xsl:when test="$code = '04'">Secret</xsl:when>
            <xsl:when test="$code = '05'">Top Secret</xsl:when>
            <xsl:otherwise>Unknown (
                <xsl:value-of select="$code"/>)
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    <xsl:template match="*[local-name()='refs']" mode="table">
        <table class="tblReferences mb-5 table table-sm table-striped prelim-req-table">
            <caption class="sr-only">References</caption>
            <thead class="thead-light">
                <tr>
                    <th>Data module/Technical publication</th>
                    <th>Title</th>
                </tr>
            </thead>
            <tbody>
                <xsl:apply-templates select="*[local-name()='dmRef'] | *[local-name()='externalPubRef']" mode="refs"/>
            </tbody>
        </table>
    </xsl:template>
    <xsl:template match="*[local-name()='mainProcedure']">
        <div class="main-procedure-section mt-4">
            <xsl:call-template name="add-applic-attribute"/>
            <xsl:apply-templates/>
        </div>
    </xsl:template>
    <!-- Procedural Step Templates -->
    <xsl:template match="*[local-name()='proceduralStep']">
        <xsl:variable name="is-nested" select="parent::*[local-name()='proceduralStep']"/>
        <xsl:variable name="title-node" select="*[local-name()='title'][1]"/>
        <div class="row" id="{@id}">
            <div class="col-12">
                <!-- MODIFICATION 1: Remove levelOneBar for nested steps -->
                <xsl:variable name="step-wrapper-class">
                    <xsl:choose>
                        <xsl:when test="$is-nested">step-content-only</xsl:when>
                        <xsl:otherwise>levelOneBar</xsl:otherwise>
                    </xsl:choose>
                </xsl:variable>
                <div class="{$step-wrapper-class}">
                    <div class="d-flex">
                        <div class="step-number-container">
                            <xsl:choose>
                                <xsl:when test="$is-nested">
                                    <div class="subparaNo">
                                        <xsl:number level="multiple" count="*[local-name()='proceduralStep']" format="1.1"/>
                                    </div >
                                </xsl:when>
                                <xsl:otherwise>
                                    <div class="roundedBullet">
                                        <xsl:number level="single" count="*[local-name()='proceduralStep'][not(parent::*[local-name()='proceduralStep'])]" format="1"/>
                                    </div>
                                </xsl:otherwise>
                            </xsl:choose>
                        </div>
                        <xsl:choose>
                            <!-- Case 1: Has a <title> (e.g., PURPOSE) -->
                            <xsl:when test="$title-node">
                                <!-- Only output the title here. -->
                                <div class="para0Title flex-grow-1">
                                    <xsl:apply-templates select="$title-node"/>
                                </div>
                            </xsl:when>
                            <!-- Case 2: No <title> (e.g., FUNCTIONS) -->
                            <xsl:otherwise>
                                <!-- Put ALL content (all children) here -->
                                <div class="flex-grow-1">
                                    <xsl:apply-templates select="*"/>
                                </div >
                            </xsl:otherwise>
                        </xsl:choose>
                    </div>
                    <!-- Only output step-content-wrapper if we had a <title> in the step -->
                    <xsl:if test="$title-node">
                        <div class="step-content-wrapper" style="margin-left: 45px; margin-top: 10px;">
                            <!-- MODIFICATION 2: Apply templates to all children *excluding* the title node -->
                            <xsl:apply-templates select="*[not(self::title)]"/>
                        </div>
                    </xsl:if>
                </div>
            </div>
        </div>
    </xsl:template>
    <!-- All other templates from the previous response should remain as they are: -->
    <xsl:template match="*[local-name()='proceduralStep']/*[local-name()='para']">
        <!-- Check if the <para> contains ONLY a list element (and ignore whitespace text nodes) -->
        <xsl:variable name="is-only-list" 
        select="*[local-name()='randomList' or local-name()='sequentialList'] 
                and count(*[not(self::text() and normalize-space()='')])=1"/>
        <xsl:choose>
            <xsl:when test="$is-only-list">
                <!-- If only a list, apply templates directly to the list to skip the <p> tag -->
                <xsl:apply-templates/>
            </xsl:when>
            <xsl:otherwise>
                <p class="mb-2">
                    <xsl:apply-templates/>
                </p>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    <xsl:template match="*[local-name()='proceduralStep']/*[local-name()='title']">
        <p class="mb-2 font-weight-bold">
            <xsl:apply-templates/>
        </p>
    </xsl:template>
    <xsl:template match="*[local-name()='randomList']">
        <ul class="mb-2">
            <xsl:apply-templates/>
        </ul>
    </xsl:template>
    <xsl:template match="*[local-name()='randomList']/*[local-name()='listItem']">
        <li class="m-0 pb-2">
            <xsl:apply-templates/>
        </li>
    </xsl:template>
    <xsl:template match="*[local-name()='randomList']/*[local-name()='listItem']/*[local-name()='para']">
        <span id="{@id}" class="m-0 pb-2">
            <xsl:apply-templates/>
        </span>
    </xsl:template>
    <!-- Closeout Requirements -->
    <xsl:template match="*[local-name()='closeRqmts']">
        <div class="closeout-requirements-section mt-4 mb-2">
            <xsl:call-template name="add-applic-attribute"/>
            <h2 id="{@id}" class="container-fluid closeRqmtsTitle mb-3">Closeout Requirements</h2>
            <xsl:apply-templates/>
        </div>
    </xsl:template>
    <!-- Fault Isolation Templates -->
    <xsl:template match="*[local-name()='faultDescrGroup']">
        <div class="fault-codes-section mt-4">
            <xsl:call-template name="add-applic-attribute"/>
            <h3 class="mb-2">Fault Codes</h3>
            <table class="table table-bordered table-sm prelim-req-table">
                <caption class="sr-only">Fault Codes</caption>
                <thead class="thead-light">
                    <tr>
                        <th>Fault code</th>
                        <th>Fault description</th>
                    </tr>
                </thead>
                <tbody>
                    <xsl:choose>
                        <xsl:when test="*[local-name()='faultDescr']">
                            <xsl:apply-templates/>
                        </xsl:when>
                        <xsl:otherwise>
                            <tr>
                                <td colspan="2" class="text-center">None</td>
                            </tr>
                        </xsl:otherwise>
                    </xsl:choose>
                </tbody>
            </table>
        </div>
    </xsl:template>
    <xsl:template match="*[local-name()='faultDescr']">
        <tr>
            <xsl:call-template name="add-applic-attribute"/>
            <td>
                <xsl:value-of select="*[local-name()='faultCode']"/>
            </td>
            <td>
                <xsl:apply-templates select="*[local-name()='faultDescrText']/*[local-name()='simplePara']/node()"/>
            </td>
        </tr>
    </xsl:template>
    <xsl:template match="*[local-name()='faultIsolationProcedure'] | *[local-name()='isolationProcedure']">
        <xsl:call-template name="add-applic-attribute"/>
        <xsl:apply-templates/>
    </xsl:template>
    <xsl:template match="*[local-name()='isolationMainProcedure']">
        <div class="fault-procedure-list">
            <xsl:call-template name="add-applic-attribute"/>
            <h3 class="mt-4 mb-3">Fault Isolation Procedure</h3>
            <ol>
                <xsl:apply-templates/>
            </ol>
        </div>
    </xsl:template>
    <xsl:template match="*[local-name()='isolationStep']">
        <li id="{@id}">
            <xsl:call-template name="add-applic-attribute"/>
            <div class="fault-step-content">
                <xsl:if test="*[local-name()='action']">
                    <xsl:apply-templates select="*[local-name()='action']"/>
                    <br/>
                </xsl:if>
                <xsl:apply-templates/>
            </div>
        </li>
    </xsl:template>
    <xsl:template match="*[local-name()='isolationProcedureEnd']">
        <li id="{@id}">
            <xsl:call-template name="add-applic-attribute"/>
            <div class="fault-step-content">
                <xsl:apply-templates select="*[local-name()='action']"/>
            </div>
            <div class="fault-closeout-link">
                <xsl:variable name="closeoutId" select="ancestor::*[local-name()='faultIsolation' or local-name()='isolationProcedure'][1]/*[local-name()='closeRqmts']/@id"/>
                <xsl:if test="$closeoutId">
                    <a href="#{$closeoutId}">Go to Requirements after job completion.</a>
                </xsl:if>
            </div>
        </li>
    </xsl:template>
    <xsl:template match="*[local-name()='action'] | *[local-name()='isolationStepQuestion']">
        <xsl:call-template name="add-applic-attribute"/>
        <xsl:apply-templates/>
    </xsl:template>
    <xsl:template match="*[local-name()='isolationStepAnswer']">
        <ul class="fault-answers">
            <xsl:call-template name="add-applic-attribute"/>
            <xsl:apply-templates select="*[local-name()='yesNoAnswer']/*"/>
        </ul>
    </xsl:template>
    <xsl:template match="*[local-name()='yesAnswer'] | *[local-name()='noAnswer']">
        <li>
            <xsl:variable name="targetId" select="@nextActionRefId"/>
            <xsl:variable name="targetNode" select="key('ids', $targetId)"/>
            <xsl:variable name="targetNumber" select="count($targetNode/preceding-sibling::*[local-name()='isolationStep' or local-name()='isolationProcedureEnd']) + 1"/>
            <xsl:choose>
                <xsl:when test="local-name()='yesAnswer'">Yes: </xsl:when>
                <xsl:otherwise>No: </xsl:otherwise>
            </xsl:choose>
            <a href="#{$targetId}">Go to Step
                <xsl:value-of select="$targetNumber"/>.
            </a>
        </li>
    </xsl:template>
    <!--
    ==========================================================================================
    START: NEW GENERIC PARSER FOR ESCAPED TAGS IN TEXT
    This entire block replaces the previous text() and parse-escaped-refs templates.
    It can handle any escaped tag by dispatching it to a dedicated handler template.
    ==========================================================================================
    -->
    <!-- STEP 1: THE GENERIC RECURSIVE PARSER -->
    <xsl:template name="parse-escaped-xml">
        <xsl:param name="text"/>
        <xsl:choose>
            <xsl:when test="contains($text, '&lt;') and contains($text, '&gt;') and contains($text, '&lt;/')">
                <xsl:value-of select="substring-before($text, '&lt;')"/>
                <xsl:variable name="tag_and_after" select="substring-after($text, '&lt;')"/>
                <xsl:variable name="tagName">
                    <xsl:choose>
                        <xsl:when test="contains($tag_and_after, ' ')">
                            <xsl:value-of select="substring-before($tag_and_after, ' ')"/>
                        </xsl:when>
                        <xsl:otherwise>
                            <xsl:value-of select="substring-before($tag_and_after, '&gt;')"/>
                        </xsl:otherwise>
                    </xsl:choose>
                </xsl:variable>
                <xsl:variable name="endMarker" select="concat('&lt;/', $tagName, '&gt;')"/>
                <xsl:variable name="fullTagBlock" select="concat('&lt;', substring-before($tag_and_after, $endMarker), $endMarker)"/>
                <xsl:variable name="textAfterTag" select="substring-after($text, $fullTagBlock)"/>
                <!-- STEP 2: THE DISPATCHER -->
                <xsl:choose>
                    <xsl:when test="starts-with($tag_and_after, 'internalRef')">
                        <xsl:call-template name="process-internalRef-string">
                            <xsl:with-param name="tagString" select="substring-before($tag_and_after, '&lt;/internalRef&gt;')"/>
                        </xsl:call-template>
                    </xsl:when>
                    <xsl:when test="starts-with($tag_and_after, 'symbol')">
                        <xsl:call-template name="process-symbol-string">
                            <xsl:with-param name="tagString" select="substring-before($tag_and_after, '&lt;/symbol&gt;')"/>
                        </xsl:call-template>
                    </xsl:when>
                    <xsl:when test="starts-with($tag_and_after, 'emphasis')">
                        <xsl:call-template name="process-emphasis-string">
                            <xsl:with-param name="tagString" select="substring-before($tag_and_after, '&lt;/emphasis&gt;')"/>
                        </xsl:call-template>
                    </xsl:when>
                    <!-- To handle more tags, add new <xsl:when> blocks here -->
                    <xsl:otherwise>
                        <xsl:value-of select="concat('&lt;', $tag_and_after)"/>
                    </xsl:otherwise>
                </xsl:choose>
                <!-- RECURSIVE CALL -->
                <xsl:call-template name="parse-escaped-xml">
                    <xsl:with-param name="text" select="$textAfterTag"/>
                </xsl:call-template>
            </xsl:when>
            <xsl:otherwise>
                <xsl:value-of select="$text"/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    <!-- STEP 3: SPECIFIC HANDLER TEMPLATES -->
    <xsl:template name="process-internalRef-string">
        <xsl:param name="tagString"/>
        <xsl:variable name="idString" select="substring-after($tagString, 'internalRefId=&quot;')"/>
        <xsl:variable name="target-id" select="substring-before($idString, '&quot;')"/>
        <xsl:variable name="display-text" select="substring-after($tagString, '&gt;')"/>
        <a href="#{$target-id}">
            <xsl:value-of select="$display-text"/>
        </a>
    </xsl:template>
    <xsl:template name="process-symbol-string">
        <xsl:param name="tagString"/>
        <xsl:variable name="icnString" select="substring-after($tagString, 'infoEntityIdent=&quot;')"/>
        <xsl:variable name="icn" select="substring-before($icnString, '&quot;')"/>
        <img class="inline-symbol">
            <xsl:attribute name="src">
                <xsl:value-of select="concat('illustrations/', translate($icn, '–—', '--'), '.svg')"/>
            </xsl:attribute>
            <xsl:attribute name="alt">
                <xsl:value-of select="$icn"/>
            </xsl:attribute>
        </img>
    </xsl:template>
    <xsl:template name="process-emphasis-string">
        <xsl:param name="tagString"/>
        <xsl:variable name="display-text" select="substring-after($tagString, '&gt;')"/>
        <strong class="font-weight-bold">
            <xsl:value-of select="$display-text"/>
        </strong>
    </xsl:template>
    <!-- STEP 4: THE ENTRY POINT -->
    <xsl:template match="text()">
        <xsl:call-template name="parse-escaped-xml">
            <xsl:with-param name="text" select="."/>
        </xsl:call-template>
    </xsl:template>
    <!--
    ==========================================================================================
    END: NEW GENERIC PARSER
    ==========================================================================================
    -->
    <xsl:template match="*[local-name()='emphasis']">
        <span id="{@id}" class="font-weight-bold">
            <xsl:apply-templates/>
        </span>
    </xsl:template>
    <xsl:template match="*[local-name()='underline']">
        <span class="text-decoration-underline">
            <xsl:apply-templates/>
        </span>
    </xsl:template>
    <xsl:template match="*[local-name()='acronym']">
        <abbr>
            <xsl:attribute name="title">
                <xsl:value-of select="*[local-name()='acronymDefinition']"/>
            </xsl:attribute>
            <xsl:call-template name="add-applic-attribute"/>
            <xsl:value-of select="*[local-name()='acronymTerm']"/>
        </abbr>
    </xsl:template>
    <xsl:template match="table">
        <div class="row">
            <div class="col-12">
                <div class="levelOneBar">
                    <div class="d-flex" style= "display:flex !important">
                        <div class="para0Indent" style="text-align: left; margin-left: 66px; padding-top: 6px; padding-bottom: 6px"/>
                        <div class="para0TextDescription flex-grow-1 pb-3" style=" padding-bottom: 1rem !important">
                            <xsl:if test="title">
                                <div class="text-center font-italic mt-2 mb-1" id="tbl-{generate-id(.)}">
                        Table
                                    <xsl:number level="any" count="table" from="content"/>
                                    <xsl:text> - </xsl:text>
                                    <xsl:apply-templates select="title" mode="inline"/>
                                </div>
                            </xsl:if>
                            <table border="1" style= "width: 100%; text-align: left; border-spacing: 0; border-collapse: separate; border-radius: 8px; border: 2px solid #E7E7E7; margin-bottom: 16px ">
                                <xsl:apply-templates select="@*"/>
                                <xsl:apply-templates select="tgroup"/>
                                <xsl:apply-templates select="tbody[not(parent::tgroup)]"/>
                                <xsl:if test="not(tgroup) and not(tbody) and row">
                                    <tbody>
                                        <xsl:apply-templates select="row"/>
                                    </tbody>
                                </xsl:if>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </xsl:template>
    <xsl:template match="tgroup">
        <xsl:apply-templates select="thead"/>
        <xsl:apply-templates select="tbody"/>
    </xsl:template>
    <xsl:template match="thead">
        <thead>
            <xsl:apply-templates select="row"/>
        </thead>
    </xsl:template>
    <xsl:template match="tbody">
        <tbody>
            <xsl:apply-templates select="row"/>
        </tbody>
    </xsl:template>
    <xsl:template match="row">
        <tr>
            <xsl:apply-templates select="entry"/>
        </tr>
    </xsl:template>
    <xsl:template match="entry">
        <td>
            <xsl:if test="@morerows">
                <xsl:attribute name="rowspan">
                    <xsl:value-of select="number(@morerows) + 1"/>
                </xsl:attribute>
            </xsl:if>
            <xsl:if test="@namest and @nameend">
                <xsl:variable name="start" select="number(substring-after(@namest, 'c'))"/>
                <xsl:variable name="end" select="number(substring-after(@nameend, 'c'))"/>
                <xsl:attribute name="colspan">
                    <xsl:value-of select="$end - $start + 1"/>
                </xsl:attribute>
            </xsl:if>
            <xsl:attribute name="valign">top</xsl:attribute>
            <xsl:if test="position() = 1 and ancestor::tbody">
                <xsl:attribute name="class">pb-4</xsl:attribute>
                <xsl:attribute name="width">20%</xsl:attribute>
            </xsl:if>
            <xsl:if test="ancestor::thead">
                <xsl:attribute name="class">pb-4 font-weight-bold</xsl:attribute>
            </xsl:if>
            <xsl:apply-templates/>
        </td>
    </xsl:template>
    <xsl:template match="@*">
        <xsl:copy/>
    </xsl:template>
    <!-- Figure and Symbol Templates -->
    <xsl:template name="create-media-container">
        <xsl:param name="elementId" select="''"/>
        <xsl:param name="content"/>
        <div class="row" id="{$elementId}">
            <div class="col-12">
                <!-- <div class="levelOneBar"> -->
                <div class="d-flex">
                    <div class="para0Indent"/>
                    <div class="para0TextDescription flex-grow-1 pb-3">
                        <xsl:copy-of select="$content"/>
                    </div>
                </div>
                <!-- </div> -->
            </div>
        </div>
    </xsl:template>
    <xsl:template match="figure">
        <xsl:call-template name="create-media-container">
            <xsl:with-param name="elementId" select="@id"/>
            <xsl:with-param name="content">
                <xsl:if test="title">
                    <div class="text-center font-italic mt-2 mb-1" id="fig-{generate-id(.)}">
                    Fig
                        <xsl:number level="any" count="figure" from="content"/>
                        <xsl:text> </xsl:text>
                        <xsl:apply-templates select="title" mode="inline"/>
                    </div>
                </xsl:if>
                <div class="text-center">
                    <div class="container-fluid m-0 pb-4">
                        <xsl:apply-templates select="graphic"/>
                        <!-- <br/> -->
                        <button class="btn btn-sm btn-secondary mb-1 icn-link">View</button>
                        <br/>
                        <div class="icn mb-2">
                            <xsl:value-of select="graphic/@infoEntityIdent"/>
                        </div>
                    </div>
                </div>
            </xsl:with-param>
        </xsl:call-template>
    </xsl:template>
    <xsl:template match="symbol">
        <xsl:call-template name="create-media-container">
            <xsl:with-param name="elementId" select="@id"/>
            <xsl:with-param name="content">
                <div class="text-center">
                    <div class="container-fluid m-0 pb-4">
                        <xsl:apply-templates select="." mode="generate-image"/>
                        <!-- <br/> -->
                        <!-- <div class="icn">
                            <xsl:value-of select="@infoEntityIdent"/>
                        </div> -->
                    </div>
                </div>
            </xsl:with-param>
        </xsl:call-template>
    </xsl:template>
    <xsl:template match="graphic | symbol" mode="generate-image">
        <img class="img-fluid fig">
            <xsl:attribute name="src">
                <xsl:value-of select="concat('illustrations/', translate(@infoEntityIdent, '–—', '--'), '.png')"/>
            </xsl:attribute>
            <xsl:attribute name="alt">
                <xsl:choose>
                    <xsl:when test="parent::figure and ../title">
                        <xsl:value-of select="../title"/>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:value-of select="@infoEntityIdent"/>
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:attribute>
        </img>
    </xsl:template>
    <xsl:template match="graphic">
        <xsl:apply-templates select="." mode="generate-image"/>
    </xsl:template>
    <xsl:template match="*[local-name()='title']" mode="inline">
        <xsl:apply-templates/>
    </xsl:template>
    <xsl:template match="*[local-name()='internalRef']">
        <xsl:variable name="target-id" select="@internalRefId"/>
        <xsl:variable name="target" select="key('ids', $target-id)"/>
        <a href="#{$target-id}">
            <xsl:choose>
                <!-- <xsl:when test="local-name($target)='figure'">
                    <xsl:text>Fig </xsl:text>
                    <xsl:variable name="fig_scope" select="$target/ancestor::*[local-name()='content'][1] | $target/ancestor::*[local-name()='procedure'][1] | $target/ancestor::*[local-name()='description'][1] | $target/ancestor::*[local-name()='mainProcedure'][1]"/>
                    <xsl:number format="1" value="count($target/preceding-sibling::*[local-name()='figure'][count(.|$fig_scope/descendant::*[local-name()='figure']) = count($fig_scope/descendant::*[local-name()='figure'])]) + 1"/>
                </xsl:when> -->
                <xsl:when test="local-name($target)='table'">
                    <xsl:text>Table </xsl:text>
                    <xsl:variable name="tbl_scope" select="$target/ancestor::*[local-name()='content'][1] | $target/ancestor::*[local-name()='procedure'][1] | $target/ancestor::*[local-name()='description'][1] | $target/ancestor::*[local-name()='mainProcedure'][1]"/>
                    <xsl:number format="1" value="count($target/preceding-sibling::*[local-name()='table'][count(.|$tbl_scope/descendant::*[local-name()='table']) = count($tbl_scope/descendant::*[local-name()='table'])]) + 1"/>
                </xsl:when>
                <xsl:when test="local-name($target)='levelledPara'">
                    <xsl:text>Para </xsl:text>
                    <xsl:variable name="lp_scope" select="$target/ancestor::*[local-name()='procedure'][1] | $target/ancestor::*[local-name()='description'][1]"/>
                    <xsl:number format="1" value="count($target/preceding-sibling::*[local-name()='levelledPara'][count(.|$lp_scope/*[local-name()='levelledPara']) = count($lp_scope/*[local-name()='levelledPara'])]) + 1"/>
                </xsl:when>
                <xsl:when test="local-name($target)='proceduralStep'">
                    <xsl:text>Step </xsl:text>(
                    <xsl:value-of select="$target-id"/>)
                </xsl:when>
                <xsl:when test="normalize-space(.)">
                    <xsl:apply-templates/>
                </xsl:when>
                <xsl:when test="$target/*[local-name()='title']">
                    <xsl:apply-templates select="$target/*[local-name()='title']" mode="inline"/>
                </xsl:when>
                <xsl:otherwise>Ref (
                    <xsl:value-of select="$target-id"/>)
                </xsl:otherwise>
            </xsl:choose>
        </a>
    </xsl:template>
    <xsl:template match="*[local-name()='pmRef']">
        <xsl:variable name="pmIdent" select="*[local-name()='pmRefIdent']"/>
        <xsl:variable name="pmCodeEl" select="$pmIdent/*[local-name()='pmCode']"/>
        <xsl:variable name="langEl" select="$pmIdent/*[local-name()='language']"/>
        <xsl:variable name="issueEl" select="$pmIdent/*[local-name()='issueInfo']"/>
        <xsl:variable name="pm_mic" select="$pmCodeEl/@modelIdentCode"/>
        <xsl:variable name="pm_issuer" select="$pmCodeEl/@pmIssuer"/>
        <xsl:variable name="pm_number" select="$pmCodeEl/@pmNumber"/>
        <xsl:variable name="pm_volume" select="$pmCodeEl/@pmVolume"/>
        <xsl:variable name="pm_filename" select="concat(translate(concat($pm_mic, '-', $pm_issuer, '-', $pm_number, '-', $pm_volume), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '.html')"/>
        <a href="{$pm_filename}" class="pm-reference-link">
            <xsl:text>PM: </xsl:text>
            <xsl:value-of select="$pm_mic"/>-
            <xsl:value-of select="$pm_issuer"/>-
            <xsl:value-of select="$pm_number"/>-
            <xsl:value-of select="$pm_volume"/>
            <xsl:if test="$issueEl">; Issue:
                <xsl:value-of select="$issueEl/@issueNumber"/>
                <xsl:if test="$issueEl/@inWork and $issueEl/@inWork != '00'"> (InWork:
                    <xsl:value-of select="$issueEl/@inWork"/>)
                </xsl:if>
            </xsl:if>
            <xsl:if test="$langEl">; Lang:
                <xsl:value-of select="$langEl/@languageIsoCode"/>-
                <xsl:value-of select="$langEl/@countryIsoCode"/>
            </xsl:if>.
        </a>
    </xsl:template>
    <xsl:template match="*[local-name()='reqTechInfoGroup']">
        <div class="req-tech-info-group mt-3">
            <xsl:call-template name="add-applic-attribute"/>
            <h4 class="mb-2">Required Technical Information</h4>
            <table class="tblReferences table-bordered table-sm table-striped prelim-req-table">
                <thead class="thead-light">
                    <tr>
                        <th>Category</th>
                        <th>Data Module / Technical Publication</th>
                    </tr>
                </thead>
                <tbody>
                    <xsl:choose>
                        <xsl:when test="*[local-name()='reqTechInfo']">
                            <xsl:apply-templates/>
                        </xsl:when>
                        <xsl:otherwise>
                            <tr>
                                <td colspan="2" class="text-center">None</td>
                            </tr>
                        </xsl:otherwise>
                    </xsl:choose>
                </tbody>
            </table>
        </div>
    </xsl:template>
    <xsl:template match="*[local-name()='reqTechInfo']">
        <tr>
            <xsl:call-template name="add-applic-attribute"/>
            <td>
                <xsl:value-of select="@reqTechInfoCategory"/>
            </td>
            <td>
                <xsl:apply-templates/>
            </td>
        </tr>
    </xsl:template>
    <xsl:template match="*[local-name()='safetyRqmts']">
        <xsl:call-template name="add-applic-attribute"/>
        <xsl:apply-templates/>
    </xsl:template>
    <!-- Warning, Caution, Note Templates -->
    <xsl:template match="*[local-name()='warning']">
        <div class="row">
            <xsl:call-template name="add-applic-attribute"/>
            <div class="col-12">
                <table class="warningBackground">
                    <tbody>
                        <tr>
                            <td class="text-center p-4">
                                <table class="warningBody">
                                    <tbody>
                                        <tr>
                                            <td class="text-center font-weight-bold p-4">
                                                <div class="h6 font-weight-bold">WARNING</div>
                                                <div class="font-weight-bold">
                                                    <p class="pb-0 m-0">
                                                        <xsl:apply-templates select="*[local-name()='warningAndCautionPara']"/>
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </xsl:template>
    <xsl:template match="*[local-name()='caution']">
        <div class="row">
            <xsl:call-template name="add-applic-attribute"/>
            <div class="col-12">
                <table class="cautionBackground">
                    <tbody>
                        <tr>
                            <td class="text-center p-4">
                                <table class="cautionBody">
                                    <tbody>
                                        <tr>
                                            <td class="text-center font-weight-bold p-4">
                                                <div class="h6 font-weight-bold">CAUTION</div>
                                                <div class="font-weight-bold">
                                                    <p class="pb-0 m-0">
                                                        <xsl:apply-templates select="*[local-name()='warningAndCautionPara']"/>
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </xsl:template>
    <xsl:template match="*[local-name()='warningAndCautionPara'] | *[local-name()='notePara']">
        <p class="mb-0">
            <xsl:call-template name="add-applic-attribute"/>
            <xsl:apply-templates/>
        </p>
    </xsl:template>
    <xsl:template match="*[local-name()='dmRef']">
        <xsl:variable name="ref-dmc_raw">
            <xsl:apply-templates select="*[local-name()='dmRefIdent']/*[local-name()='dmCode']" mode="text"/>
        </xsl:variable>
        <xsl:variable name="ref-dmc" select="normalize-space($ref-dmc_raw)"/>
        <xsl:variable name="ref-filename" select="concat('DMC-', $ref-dmc, '.html')"/>
        <a href="{$ref-filename}">
            <xsl:value-of select="$ref-dmc"/>
        </a>
    </xsl:template>
    <xsl:template match="*[local-name()='dmRef']" mode="refs">
        <tr>
            <xsl:call-template name="add-applic-attribute"/>
            <td>
                <xsl:apply-templates select="."/>
            </td>
            <td>
                <xsl:variable name="ref-dmc_raw">
                    <xsl:apply-templates select="*[local-name()='dmRefIdent']/*[local-name()='dmCode']" mode="text"/>
                </xsl:variable>
                <xsl:variable name="ref-dmc" select="normalize-space($ref-dmc_raw)"/>
                <xsl:variable name="ref-filename" select="concat($csdb-path, 'DMC-', $ref-dmc, '.xml')"/>
                <xsl:variable name="referenced-doc" select="document($ref-filename)"/>
                <xsl:variable name="info-name" select="$referenced-doc/*[local-name()='dmodule']/*[local-name()='identAndStatusSection']/*[local-name()='dmAddress']/*[local-name()='dmAddressItems']/*[local-name()='dmTitle']/*[local-name()='infoName']/text()"/>
                <xsl:choose>
                    <xsl:when test="normalize-space($info-name)">
                        <xsl:value-of select="$info-name"/>
                    </xsl:when>
                    <xsl:otherwise>N/A</xsl:otherwise>
                </xsl:choose>
            </td>
        </tr>
    </xsl:template>
    <xsl:template match="*[local-name()='externalPubRef']" mode="refs">
        <tr>
            <xsl:call-template name="add-applic-attribute"/>
            <td>
                <xsl:choose>
                    <xsl:when test="@xlink:href">
                        <a href="{@xlink:href}" target="_blank" rel="noopener noreferrer">
                            <xsl:value-of select="*[local-name()='externalPubRefIdent']/*[local-name()='externalPubCode']"/>
                            <xsl:choose>
                                <xsl:when test="*[local-name()='externalPubRefAddressItems']/*[local-name()='externalPubTitle']/descendant-or-self::*/text()[normalize-space()]">
                                    <xsl:apply-templates select="*[local-name()='externalPubRefAddressItems']/*[local-name()='externalPubTitle']/node()"/>
                                </xsl:when>
                                <xsl:when test="*[local-name()='externalPubRefIdent']/*[local-name()='externalPubTitle']/descendant-or-self::*/text()[normalize-space()]">
                                    <xsl:apply-templates select="*[local-name()='externalPubRefIdent']/*[local-name()='externalPubTitle']/node()"/>
                                </xsl:when>
                                <xsl:otherwise>N/A</xsl:otherwise>
                            </xsl:choose>
                        </a>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:value-of select="*[local-name()='externalPubRefIdent']/*[local-name()='externalPubCode']"/>
                    </xsl:otherwise>
                </xsl:choose>
            </td>
            <td>
                <xsl:text>External Link</xsl:text>
            </td>
        </tr>
    </xsl:template>
    <xsl:template match="*[local-name()='pmRef']" mode="refs">
        <tr>
            <xsl:call-template name="add-applic-attribute"/>
            <td>
                <xsl:apply-templates select="."/>
            </td>
            <td>
                <xsl:text>Publication Module</xsl:text>
                <xsl:if test="*[local-name()='pmRefAddressItems']/*[local-name()='pmTitle']/descendant-or-self::*/text()[normalize-space()]">
                    <xsl:text> – </xsl:text>
                    <xsl:apply-templates select="*[local-name()='pmRefAddressItems']/*[local-name()='pmTitle']/node()"/>
                </xsl:if>
            </td>
        </tr>
    </xsl:template>
    <xsl:template match="*[local-name()='dmIdent'] | *[local-name()='dmRefIdent']">
        <xsl:apply-templates select="*[local-name()='dmCode']" mode="text"/>
    </xsl:template>
    <xsl:template match="*[local-name()='dmCode']" mode="text">
        <xsl:value-of select="concat(@modelIdentCode, '-', @systemDiffCode, '-', @systemCode, '-', @subSystemCode, @subSubSystemCode, '-', @assyCode, '-', @disassyCode, @disassyCodeVariant, '-', @infoCode, @infoCodeVariant, '-', @itemLocationCode)"/>
    </xsl:template>
    <xsl:template match="*[local-name()='dmCode']">
        <xsl:value-of select="concat(@modelIdentCode, '-', @systemDiffCode, '-', @systemCode, '-', @subSystemCode, @subSubSystemCode, '-', @assyCode, '-', @disassyCode, @disassyCodeVariant, '-', @infoCode, @infoCodeVariant, '-', @itemLocationCode)"/>
    </xsl:template>
    <xsl:template match="*[local-name()='issueDate']">
        <xsl:value-of select="@year"/>-
        <xsl:value-of select="@month"/>-
        <xsl:value-of select="@day"/>
    </xsl:template>
    <xsl:template match="*[local-name()='language']">
        <xsl:value-of select="@languageIsoCode"/>/
        <xsl:value-of select="@countryIsoCode"/>
    </xsl:template>
    <xsl:template match="*[local-name()='dmTitle']">
        <xsl:apply-templates select="*[local-name()='techName']"/>
        <xsl:if test="*[local-name()='infoName']"> –
            <xsl:apply-templates select="*[local-name()='infoName']"/>
        </xsl:if>
        <xsl:if test="*[local-name()='infoNameVariant']"> (
            <xsl:apply-templates select="*[local-name()='infoNameVariant']"/>)
        </xsl:if>
    </xsl:template>
    <xsl:template match="*[local-name()='techName'] | *[local-name()='infoName'] | *[local-name()='infoNameVariant']">
        <xsl:value-of select="." disable-output-escaping="yes"/>
    </xsl:template>
    <xsl:template match="*[local-name()='responsiblePartnerCompany'] | *[local-name()='originator']">
        <xsl:value-of select="*[local-name()='enterpriseName']"/> (
        <xsl:value-of select="@enterpriseCode"/>)
    </xsl:template>
    <xsl:template name="object-id">
        <xsl:param name="object" select="."/>
        <xsl:choose>
            <xsl:when test="$object/@id">
                <xsl:value-of select="$object/@id"/>
            </xsl:when>
            <xsl:otherwise>
                <xsl:value-of select="generate-id($object)"/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    <xsl:template match="text()[normalize-space(.) = '']"/>
</xsl:stylesheet>