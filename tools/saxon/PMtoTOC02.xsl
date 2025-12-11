<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:output method="text" encoding="UTF-8" indent="yes"/>
    <xsl:strip-space elements="*"/>
    <!-- Helper template for quoting strings and basic JSON escaping (Unchanged) -->
    <xsl:template name="output-string">
        <xsl:param name="value"/>
        <xsl:text>"</xsl:text>
        <xsl:variable name="escaped-bs" select="translate($value, '\', '\\')"/>
        <xsl:variable name="escaped-quotes" select="translate($escaped-bs, '', '\')"/>
        <xsl:value-of select="translate($escaped-quotes, '', '\')"/>
        <xsl:text>"</xsl:text>
    </xsl:template>
    <xsl:variable name="dmcString">
        <xsl:call-template name="generate-dmc-string">
            <xsl:with-param name="dmCodeNode" select="dmRefIdent/dmCode"/>
        </xsl:call-template>
    </xsl:variable>
    <!-- Template to construct the standard DMC string (Unchanged) -->
    <xsl:template name="generate-dmc-string">
        <xsl:param name="dmCodeNode"/>
        <xsl:if test="$dmCodeNode">
            <xsl:value-of select="$dmCodeNode/@modelIdentCode"/>
            <xsl:text>-</xsl:text>
            <xsl:value-of select="$dmCodeNode/@systemDiffCode"/>
            <xsl:text>-</xsl:text>
            <xsl:value-of select="$dmCodeNode/@systemCode"/>
            <xsl:text>-</xsl:text>
            <xsl:value-of select="$dmCodeNode/@subSystemCode"/>
            <xsl:text></xsl:text>
            <xsl:value-of select="$dmCodeNode/@subSubSystemCode"/>
            <xsl:text>-</xsl:text>
            <xsl:value-of select="$dmCodeNode/@assyCode"/>
            <xsl:text>-</xsl:text>
            <xsl:value-of select="$dmCodeNode/@disassyCode"/>
            <xsl:text></xsl:text>
            <xsl:value-of select="$dmCodeNode/@disassyCodeVariant"/>
            <xsl:text>-</xsl:text>
            <xsl:value-of select="$dmCodeNode/@infoCode"/>
            <xsl:text></xsl:text>
            <xsl:value-of select="$dmCodeNode/@infoCodeVariant"/>
            <xsl:text>-</xsl:text>
            <xsl:value-of select="$dmCodeNode/@itemLocationCode"/>
        </xsl:if>
    </xsl:template>
    <!-- Root template (Unchanged) -->
    <xsl:template match="/pm">
        <xsl:text>const ToC = [</xsl:text>
        <xsl:apply-templates select="content/pmEntry | content/dmRef"/>
        <xsl:text>
];</xsl:text>
        <xsl:text>

module.exports = ToC;</xsl:text>
    </xsl:template>
    <!-- MODIFIED Template for pmEntry (Category/Folder) -->
    <xsl:template match="pmEntry">
        <!-- Only create an object if the pmEntry has a non-empty title -->
        <xsl:if test="normalize-space(pmEntryTitle) != ''">
            <!-- Add comma if this is not the first element processed *at this level* -->
            <xsl:if test="preceding-sibling::*[self::pmEntry or self::dmRef]">
                <xsl:text>,</xsl:text>
            </xsl:if>
            <xsl:variable name="parentPmEntry" select="ancestor::pmEntry[1]"/>
            <xsl:variable name="displayNameValue" select="normalize-space(pmEntryTitle)"/>
            <xsl:variable name="currentId" select="generate-id(.)"/>
            <xsl:variable name="randomId" select="concat(generate-id(.), '-', translate(substring(string(current-dateTime()), 12), ':', ''))"/>
            <xsl:text>
  {
    </xsl:text>
            <xsl:text>
    "ID": </xsl:text>
            <xsl:call-template name="output-string">
                <xsl:with-param name="value" select="$currentId"/>
            </xsl:call-template>
            <xsl:text>,</xsl:text>
            <xsl:text>
    "CategoryId": </xsl:text>
            <xsl:choose>
                <xsl:when test="$parentPmEntry">
                    <xsl:call-template name="output-string">
                        <xsl:with-param name="value" select="generate-id($parentPmEntry)"/>
                    </xsl:call-template>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:text>null</xsl:text>
                </xsl:otherwise>
            </xsl:choose>
            <xsl:text>,</xsl:text>
            <xsl:text>
    "DisplayName": </xsl:text>
            <xsl:call-template name="output-string">
                <xsl:with-param name="value" select="$displayNameValue"/>
            </xsl:call-template>
            <xsl:text>,</xsl:text>
            <xsl:text>
    "PMEntryType": null,</xsl:text>
            <xsl:text>
    "DMC": null,</xsl:text>
            <xsl:text>
    "AddedNew": false,</xsl:text>
            <xsl:text>
    "dmIdUpissued": false,</xsl:text>
            <xsl:text>
    "dmId": 0,</xsl:text>
            <xsl:text>
    "pmId": 0,</xsl:text>
            <xsl:text>
    "expanded": false,</xsl:text>
            <xsl:text>
    "Type": 0,</xsl:text>
            <xsl:text>
    "dmRef": null,</xsl:text>
            <xsl:text>
    "pmRefs": null,</xsl:text>
            <xsl:text>
    "Children": []</xsl:text>
            <xsl:text>
  },</xsl:text>
        </xsl:if>
        <!-- Always process children, even if the current pmEntry was a wrapper -->
        <xsl:apply-templates select="pmEntry | dmRef"/>
    </xsl:template>
    <!-- MODIFIED Template for dmRef (Data Module/Leaf Node) -->
    <xsl:template match="dmRef">
        <!-- MODIFIED: Add comma if the parent wrapper has a preceding sibling -->
        <xsl:if test="ancestor::pmEntry[1]/preceding-sibling::pmEntry">
            <xsl:text>,</xsl:text>
        </xsl:if>
        <!-- MODIFIED: Get the nearest ancestor pmEntry WITH A TITLE for CategoryId -->
        <xsl:variable name="parentPmEntry" select="ancestor::pmEntry[normalize-space(pmEntryTitle)][1]"/>
        <xsl:variable name="currentId" select="generate-id(.)"/>
        <xsl:variable name="dmcString">
            <xsl:call-template name="generate-dmc-string">
                <xsl:with-param name="dmCodeNode" select="dmRefIdent/dmCode"/>
            </xsl:call-template>
        </xsl:variable>
        <xsl:variable name="techNameValue" select="normalize-space(dmRefAddressItems/dmTitle/techName)"/>
        <xsl:variable name="infoNameValue" select="normalize-space(dmRefAddressItems/dmTitle/infoName)"/>
        <xsl:variable name="displayNameValue">
            <!-- <xsl:value-of select="$dmcString"/> -->
            <xsl:if test="$techNameValue != ''">
                <xsl:text> </xsl:text>
                <xsl:value-of select="$techNameValue"/>
            </xsl:if>
            <xsl:if test="$infoNameValue != ''">
                <xsl:text>-</xsl:text>
                <xsl:value-of select="$infoNameValue"/>
            </xsl:if>
        </xsl:variable>
        <xsl:if test="normalize-space($dmcString) != ''">
            <xsl:text>
  {</xsl:text>
            <xsl:text>
    "ID": </xsl:text>
            <xsl:call-template name="output-string">
                <xsl:with-param name="value" select="concat('DMC-', $dmcString)"/>
            </xsl:call-template>
            <xsl:text>,</xsl:text>
            <xsl:text>
    "CategoryId": </xsl:text>
            <xsl:choose>
                <xsl:when test="$parentPmEntry">
                    <xsl:call-template name="output-string">
                        <xsl:with-param name="value" select="generate-id($parentPmEntry)"/>
                    </xsl:call-template>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:text>null</xsl:text>
                </xsl:otherwise>
            </xsl:choose>
            <xsl:text>,</xsl:text>
            <xsl:text>
    "DisplayName": </xsl:text>
            <xsl:call-template name="output-string">
                <xsl:with-param name="value" select="$displayNameValue"/>
            </xsl:call-template>
            <xsl:text>,</xsl:text>
            <xsl:text>
    "PMEntryType": null,</xsl:text>
            <xsl:text>
    "DMC": </xsl:text>
            <xsl:call-template name="output-string">
                <xsl:with-param name="value" select="$dmcString"/>
            </xsl:call-template>
            <xsl:text>,</xsl:text>
            <xsl:text>
    "AddedNew": false,</xsl:text>
            <xsl:text>
    "dmIdUpissued": false,</xsl:text>
            <xsl:text>
    "dmId": 0,</xsl:text>
            <xsl:text>
    "pmId": 0,</xsl:text>
            <xsl:text>
    "expanded": false,</xsl:text>
            <xsl:text>
    "Type": 1,</xsl:text>
            <xsl:text>
    "dmRef": </xsl:text>
            <xsl:apply-templates select="." mode="json"/>
            <xsl:text>,</xsl:text>
            <xsl:text>
    "pmRefs": null,</xsl:text>
            <xsl:text>
    "Children": []</xsl:text>
            <xsl:text>
  }</xsl:text>
        </xsl:if>
    </xsl:template>
    <!-- ================================================ -->
    <!-- Templates to generate nested dmRef JSON object   -->
    <!-- (These remain the same as your previous version) -->
    <!-- ================================================ -->
    <xsl:template match="dmRef" mode="json">
        <xsl:text>{</xsl:text>
        <xsl:text>"DmRefIdent": </xsl:text>
        <xsl:apply-templates select="dmRefIdent" mode="json"/>
        <xsl:text>, </xsl:text>
        <xsl:text>"DmRefAddressItems": </xsl:text>
        <xsl:apply-templates select="dmRefAddressItems" mode="json"/>
        <xsl:text>, </xsl:text>
        <xsl:text>"ApplicRefId": null</xsl:text>
        <xsl:text>}</xsl:text>
    </xsl:template>
    <xsl:template match="dmRefIdent" mode="json">
        <xsl:text>{</xsl:text>
        <xsl:text>"DmCode": </xsl:text>
        <xsl:apply-templates select="dmCode" mode="json"/>
        <xsl:text>, </xsl:text>
        <xsl:text>"IssueInfo": </xsl:text>
        <xsl:choose>
            <xsl:when test="issueInfo">
                <xsl:apply-templates select="issueInfo" mode="json"/>
            </xsl:when>
            <xsl:otherwise>
                <xsl:text>null</xsl:text>
            </xsl:otherwise>
        </xsl:choose>
        <xsl:text>, </xsl:text>
        <xsl:text>"Language": </xsl:text>
        <xsl:choose>
            <xsl:when test="language">
                <xsl:apply-templates select="language" mode="json"/>
            </xsl:when>
            <xsl:otherwise>
                <xsl:text>null</xsl:text>
            </xsl:otherwise>
        </xsl:choose>
        <xsl:text>}</xsl:text>
    </xsl:template>
    <xsl:template match="dmCode" mode="json">
        <xsl:text>{</xsl:text>
        <xsl:text>"ModelIdentCode": </xsl:text>
        <xsl:call-template name="output-string">
            <xsl:with-param name="value" select="@modelIdentCode"/>
        </xsl:call-template>
        <xsl:text>, </xsl:text>
        <xsl:text>"SystemDiffCode": </xsl:text>
        <xsl:call-template name="output-string">
            <xsl:with-param name="value" select="@systemDiffCode"/>
        </xsl:call-template>
        <xsl:text>, </xsl:text>
        <xsl:text>"SystemCode": </xsl:text>
        <xsl:call-template name="output-string">
            <xsl:with-param name="value" select="@systemCode"/>
        </xsl:call-template>
        <xsl:text>, </xsl:text>
        <xsl:text>"SubSystemCode": </xsl:text>
        <xsl:call-template name="output-string">
            <xsl:with-param name="value" select="@subSystemCode"/>
        </xsl:call-template>
        <xsl:text>, </xsl:text>
        <xsl:text>"SubSubSystemCode": </xsl:text>
        <xsl:call-template name="output-string">
            <xsl:with-param name="value" select="@subSubSystemCode"/>
        </xsl:call-template>
        <xsl:text>, </xsl:text>
        <xsl:text>"AssyCode": </xsl:text>
        <xsl:call-template name="output-string">
            <xsl:with-param name="value" select="@assyCode"/>
        </xsl:call-template>
        <xsl:text>, </xsl:text>
        <xsl:text>"DisassyCode": </xsl:text>
        <xsl:call-template name="output-string">
            <xsl:with-param name="value" select="@disassyCode"/>
        </xsl:call-template>
        <xsl:text>, </xsl:text>
        <xsl:text>"DisassyCodeVariant": </xsl:text>
        <xsl:call-template name="output-string">
            <xsl:with-param name="value" select="@disassyCodeVariant"/>
        </xsl:call-template>
        <xsl:text>, </xsl:text>
        <xsl:text>"InfoCode": </xsl:text>
        <xsl:call-template name="output-string">
            <xsl:with-param name="value" select="@infoCode"/>
        </xsl:call-template>
        <xsl:text>, </xsl:text>
        <xsl:text>"InfoCodeVariant": </xsl:text>
        <xsl:call-template name="output-string">
            <xsl:with-param name="value" select="@infoCodeVariant"/>
        </xsl:call-template>
        <xsl:text>, </xsl:text>
        <xsl:text>"ItemLocationCode": </xsl:text>
        <xsl:call-template name="output-string">
            <xsl:with-param name="value" select="@itemLocationCode"/>
        </xsl:call-template>
        <xsl:text>}</xsl:text>
    </xsl:template>
    <xsl:template match="issueInfo" mode="json">
        <xsl:text>{</xsl:text>
        <xsl:text>"IssueNumber": </xsl:text>
        <xsl:call-template name="output-string">
            <xsl:with-param name="value" select="@issueNumber"/>
        </xsl:call-template>
        <xsl:text>, </xsl:text>
        <xsl:text>"InWork": </xsl:text>
        <xsl:call-template name="output-string">
            <xsl:with-param name="value" select="@inWork"/>
        </xsl:call-template>
        <xsl:text>}</xsl:text>
    </xsl:template>
    <xsl:template match="language" mode="json">
        <xsl:text>{</xsl:text>
        <xsl:text>"CountryIsoCode": </xsl:text>
        <xsl:call-template name="output-string">
            <xsl:with-param name="value" select="@countryIsoCode"/>
        </xsl:call-template>
        <xsl:text>, </xsl:text>
        <xsl:text>"LanguageIsoCode": </xsl:text>
        <xsl:call-template name="output-string">
            <xsl:with-param name="value" select="@languageIsoCode"/>
        </xsl:call-template>
        <xsl:text>}</xsl:text>
    </xsl:template>
    <xsl:template match="dmRefAddressItems" mode="json">
        <xsl:text>{</xsl:text>
        <xsl:text>"DmTitle": </xsl:text>
        <xsl:apply-templates select="dmTitle" mode="json"/>
        <xsl:text>, </xsl:text>
        <xsl:text>"IssueDate": null</xsl:text>
        <xsl:text>}</xsl:text>
    </xsl:template>
    <xsl:template match="dmTitle" mode="json">
        <xsl:text>{</xsl:text>
        <xsl:text>"TechName": </xsl:text>
        <xsl:choose>
            <xsl:when test="techName and normalize-space(techName) != ''">
                <xsl:text>{</xsl:text>
                <xsl:text>"Text": </xsl:text>
                <xsl:call-template name="output-string">
                    <xsl:with-param name="value" select="normalize-space(techName)"/>
                </xsl:call-template>
                <xsl:text>}</xsl:text>
            </xsl:when>
            <xsl:otherwise>null</xsl:otherwise>
        </xsl:choose>
        <xsl:text>, </xsl:text>
        <xsl:text>"InfoName": </xsl:text>
        <xsl:choose>
            <xsl:when test="infoName and normalize-space(infoName) != ''">
                <xsl:text>{</xsl:text>
                <xsl:text>"Text": </xsl:text>
                <xsl:call-template name="output-string">
                    <xsl:with-param name="value" select="normalize-space(infoName)"/>
                </xsl:call-template>
                <xsl:text>}</xsl:text>
            </xsl:when>
            <xsl:otherwise>null</xsl:otherwise>
        </xsl:choose>
        <xsl:text>}</xsl:text>
    </xsl:template>
    <!-- Ignore text nodes that are just whitespace -->
    <xsl:template match="text()[normalize-space(.)='']"/>
</xsl:stylesheet>