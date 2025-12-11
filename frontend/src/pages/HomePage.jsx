import { Link } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Scissors, Split, FileSpreadsheet, FileEdit, TableProperties, Image,
  Search, CheckCircle, FileText, Code, FileType, Hash, ExternalLink, Globe, FileJson, BookOpen, List, Wand2
} from 'lucide-react'

const allTools = [
  {
    to: '/doc-splitter',
    icon: Scissors,
    title: 'Doc Splitter',
    description: 'Split DOCX documents by headings with images and tables preserved',
    featureKey: 'doc_splitter'
  },
  {
    to: '/doc-splitter-v2',
    icon: Split,
    title: 'Doc Splitter V2',
    description: 'Enhanced document splitting with improved error handling and features',
    featureKey: 'doc_splitter_v2'
  },
  {
    to: '/excel-generator',
    icon: TableProperties,
    title: 'Excel Generator',
    description: 'Generate Excel template from filenames for easy mapping',
    featureKey: 'excel_renamer'
  },
  {
    to: '/excel-renamer',
    icon: FileSpreadsheet,
    title: 'Excel Renamer',
    description: 'Batch rename DOCX files based on Excel mapping with DMC codes',
    featureKey: 'excel_renamer'
  },
  {
    to: '/file-renamer',
    icon: FileEdit,
    title: 'File Renamer',
    description: 'Batch rename files by replacing text patterns in filenames',
    featureKey: 'file_renamer'
  },
  {
    to: '/icn-maker',
    icon: Image,
    title: 'ICN Generator',
    description: 'Create ICN-tagged images from bulk image uploads',
    featureKey: 'icn_maker'
  },
  {
    to: '/icn-extractor',
    icon: Search,
    title: 'ICN Extractor',
    description: 'Extract ICN-tagged images from DOCX documents',
    featureKey: 'icn_extractor'
  },
  {
    to: '/icn-validator',
    icon: CheckCircle,
    title: 'ICN Validator',
    description: 'Validate and audit ICN references in DOCX files',
    featureKey: 'icn_validator'
  },
  {
    to: '/auto-icn',
    icon: Wand2,
    title: 'Auto ICN',
    description: 'Automatically move ICN codes from captions to image attributes in AsciiDoc files',
    featureKey: 'auto_icn'
  },
  {
    to: '/docx-to-adoc',
    icon: FileText,
    title: 'DOCX to ADOC',
    description: 'Convert Word documents to AsciiDoc format',
    featureKey: 'docx_to_adoc'
  },
  {
    to: '/adoc-to-xml',
    icon: Code,
    title: 'ADOC to XML',
    description: 'Convert AsciiDoc to S1000D XML format',
    featureKey: 'adoc_to_s1000d'
  },
  {
    to: '/xml-to-html',
    icon: Globe,
    title: 'XML to HTML',
    description: 'Convert S1000D XML to HTML using Saxon XSLT processor',
    featureKey: 'xml_to_html'
  },
  {
    to: '/html-to-json',
    icon: FileJson,
    title: 'S1000D to DataIndex',
    description: 'Extract S1000D HTML content into searchable JSON/JS data source',
    featureKey: 'html_to_json'
  },
  {
    to: '/pmc-builder',
    icon: BookOpen,
    title: 'PMC Builder',
    description: 'Build S1000D Publication Module XML with drag-and-drop',
    featureKey: 'pmc_builder'
  },
  {
    to: '/toc-builder',
    icon: List,
    title: 'TOC Builder',
    description: 'Generate JavaScript TOC from PM XML files using XSL transformation',
    featureKey: 'toc_builder'
  },
  {
    to: '/pdf-to-docx',
    icon: FileType,
    title: 'PDF to DOCX',
    description: 'Convert PDF documents to editable DOCX format',
    featureKey: 'pdf_to_docx'
  },
  {
    to: '/dmc-generator',
    icon: Hash,
    title: 'DMC Generator',
    description: 'Generate Data Module codes for S1000D documentation',
    featureKey: 'dmc_generator'
  }
]

export default function HomePage() {
  // All tools are now always enabled (no backend feature management)
  const enabledTools = allTools

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-4xl font-bold text-foreground mb-3">
          Welcome to Agastya
        </h2>
        <p className="text-muted-foreground text-lg leading-relaxed max-w-3xl">
          A comprehensive suite of document processing tools designed for S1000D documentation workflows.
          Select a tool below to get started.
        </p>
      </div>

      {enabledTools.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No tools are currently enabled. Contact your administrator.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {enabledTools.map(({ to, icon: Icon, title, description, isExternal }) => {
            if (isExternal) {
              return (
                <a
                  key={to}
                  href={to}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group"
                >
                  <Card className="h-full transition-all hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 cursor-pointer">
                    <CardHeader className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Icon className="h-12 w-12 text-primary group-hover:scale-110 transition-transform" />
                        <ExternalLink className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-xl mb-2">{title}</CardTitle>
                        <CardDescription className="leading-relaxed">
                          {description}
                        </CardDescription>
                      </div>
                    </CardHeader>
                  </Card>
                </a>
              )
            }

            return (
              <Link key={to} to={to} className="block group">
                <Card className="h-full transition-all hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 cursor-pointer">
                  <CardHeader className="space-y-4">
                    <Icon className="h-12 w-12 text-primary group-hover:scale-110 transition-transform" />
                    <div>
                      <CardTitle className="text-xl mb-2">{title}</CardTitle>
                      <CardDescription className="leading-relaxed">
                        {description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
