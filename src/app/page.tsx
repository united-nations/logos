"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { UNCard, UNCardContent, UNCardHeader, UNCardTitle } from "@/components/custom/UNCard";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Copy, Download, Search } from "lucide-react";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

// File formats
const fileFormats = [
    { value: "svg", label: "SVG (Vector)" },
    { value: "png", label: "PNG (Raster)" },
    { value: "jpg", label: "JPG (Raster)" },
    { value: "pdf", label: "PDF (Vector)" },
];

interface UNEntity {
    entity: string;
    entity_long: string;
    un_principal_organ?: string;
}

export default function LogoSelectorPage() {
    const [selectedAgency, setSelectedAgency] = useState<string>("UN");
    const [selectedFormat, setSelectedFormat] = useState<string>("svg");
    const [includeText, setIncludeText] = useState<boolean>(true);
    const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
    const [copied, setCopied] = useState(false);
    const [unEntities, setUnEntities] = useState<UNEntity[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [logoError, setLogoError] = useState(false);

    // Reset logo error when selection changes
    useEffect(() => {
        setLogoError(false);
    }, [selectedAgency, selectedFormat, isDarkMode]);

    // Load only entities that have logo files available
    useEffect(() => {
        setLoading(true);
        fetch(`${basePath}/data/available-logos.json`)
            .then(response => response.json())
            .then((data: UNEntity[]) => {
                const sorted = [...data].sort((a, b) =>
                    a.entity_long.localeCompare(b.entity_long)
                );
                // Ensure UN is first
                const unIndex = sorted.findIndex(e => e.entity === 'UN');
                if (unIndex > -1) {
                    const [unItem] = sorted.splice(unIndex, 1);
                    sorted.unshift(unItem);
                }
                setUnEntities(sorted);
            })
            .catch(error => console.error('Error loading available logos:', error))
            .finally(() => setLoading(false));
    }, []);

    // Generate logo URL based on file structure: /images/[light|dark]/[entity].[format]
    const getLogoUrl = () => {
        if (!selectedAgency) return null;
        const mode = isDarkMode ? "dark" : "light";
        return `${basePath}/images/${mode}/${selectedAgency.toLowerCase()}.${selectedFormat}`;
    };

    // Generate embed code with absolute URL for external use
    const getEmbedCode = () => {
        const logoUrl = getLogoUrl();
        if (!logoUrl) return "";
        const entity = unEntities.find(e => e.entity === selectedAgency);
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        return `<img src="${origin}${logoUrl}" alt="${entity?.entity_long || 'UN'} Logo" />`;
    };

    const handleCopyEmbed = () => {
        navigator.clipboard.writeText(getEmbedCode());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        const logoUrl = getLogoUrl();
        if (!logoUrl) return;
        
        const link = document.createElement('a');
        link.href = logoUrl;
        link.download = `${selectedAgency}_${isDarkMode ? 'dark' : 'light'}.${selectedFormat}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const logoUrl = getLogoUrl();
    const selectedEntity = unEntities.find(e => e.entity === selectedAgency);

    return (
        <main className="min-h-screen bg-background px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-5xl mx-auto py-8">
                {/* Logo */}
                <Image
                    src={`${basePath}/images/UN_Logo_Stacked_Colour_English.svg`}
                    alt="UN Logo"
                    width={200}
                    height={48}
                    className="h-10 sm:h-12 w-auto select-none mb-12"
                    draggable={false}
                />

                {/* Header */}
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground">
                        UN Logo Selector
                    </h1>
                    <p className="mt-2 text-foreground">
                        Select your desired UN agency logo format and download or embed it.
                    </p>
                </header>

                {/* Loading State */}
                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-un-blue border-t-transparent" />
                    </div>
                )}

                {/* Selection Controls */}
                {!loading && (<>
                <section className="mb-8">
                    <UNCard>
                        <UNCardHeader>
                            <UNCardTitle>Configure the UN Agency Logo</UNCardTitle>
                        </UNCardHeader>
                        <UNCardContent>
                            <div className="space-y-6">
                                {/* First Row - UN Entity Search (Full Width) */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">
                                        UN Entity
                                    </label>
                                    <Popover open={open} onOpenChange={setOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={open}
                                                className="w-full justify-between shadow-none hover:bg-gray-50"
                                            >
                                                <span className="truncate">
                                                    {selectedAgency 
                                                        ? unEntities.find(e => e.entity === selectedAgency)?.entity_long 
                                                        : "Select entity..."}
                                                </span>
                                                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[min(900px,calc(100vw-2rem))] p-0 shadow-none" align="start">
                                            <Command>
                                                <CommandInput placeholder="Search entities..." />
                                                <CommandList>
                                                    <CommandEmpty>No entity found.</CommandEmpty>
                                                    {/* Top entity (United Nations) shown first */}
                                                    {unEntities.find(e => e.entity === 'UN') && (
                                                        <CommandGroup heading="United Nations">
                                                            <CommandItem
                                                                key="UN"
                                                                value={unEntities.find(e => e.entity === 'UN')!.entity_long}
                                                                onSelect={() => {
                                                                    setSelectedAgency('UN');
                                                                    setOpen(false);
                                                                }}
                                                            >
                                                                {unEntities.find(e => e.entity === 'UN')!.entity_long}
                                                            </CommandItem>
                                                        </CommandGroup>
                                                    )}

                                                    {/* Group by principal organ */}
                                                    {(() => {
                                                        const groups: Record<string, UNEntity[]> = {};
                                                        unEntities
                                                            .filter(e => e.entity !== 'UN')
                                                            .forEach(e => {
                                                                const key = e.un_principal_organ && e.un_principal_organ.length ? e.un_principal_organ : 'Other';
                                                                if (!groups[key]) groups[key] = [];
                                                                groups[key].push(e);
                                                            });

                                                        // Sort group keys alphabetically, keep 'Other' last
                                                        const keys = Object.keys(groups).sort((a, b) => {
                                                            if (a === 'Other') return 1;
                                                            if (b === 'Other') return -1;
                                                            return a.localeCompare(b);
                                                        });

                                                        return keys.map(key => (
                                                            <CommandGroup key={key} heading={key}>
                                                                {groups[key]
                                                                    .sort((a, b) => a.entity_long.localeCompare(b.entity_long))
                                                                    .map(entity => (
                                                                        <CommandItem
                                                                            key={entity.entity}
                                                                            value={entity.entity_long}
                                                                            onSelect={() => {
                                                                                setSelectedAgency(entity.entity);
                                                                                setOpen(false);
                                                                            }}
                                                                        >
                                                                            {entity.entity_long}
                                                                        </CommandItem>
                                                                    ))}
                                                            </CommandGroup>
                                                        ));
                                                    })()}
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                {/* Second Row - File Format, Include Text, and Dark Mode */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* File Format Selection */}
                                    <div className="flex flex-col justify-center space-y-1 p-4 rounded-lg border border-gray-200 bg-gray-50">
                                       
                                        <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                                            <SelectTrigger className="w-full shadow-none hover:bg-white border-gray-300">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {fileFormats.map((format) => (
                                                    <SelectItem key={format.value} value={format.value}>
                                                        {format.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Include Text Switch */}
                                    <div className="flex items-center justify-between space-x-4 p-4 rounded-lg border border-gray-200 bg-gray-50">
                                        <div className="space-y-0.5">
                                            <label htmlFor="include-text" className="text-sm font-medium text-foreground cursor-pointer">
                                                Include Text
                                            </label>
                                            <p className="text-xs text-gray-600">
                                                {includeText ? "Icon & Text" : "Icon Only"}
                                            </p>
                                        </div>
                                        <Switch
                                            id="include-text"
                                            checked={includeText}
                                            onCheckedChange={setIncludeText}
                                        />
                                    </div>

                                    {/* Dark Mode Switch */}
                                    <div className="flex items-center justify-between space-x-4 p-4 rounded-lg border border-gray-200 bg-gray-50">
                                        <div className="space-y-0.5">
                                            <label htmlFor="dark-mode" className="text-sm font-medium text-foreground cursor-pointer">
                                                Dark Mode
                                            </label>
                                            <p className="text-xs text-gray-600">
                                                {isDarkMode ? "Dark Version" : "Light Version"}
                                            </p>
                                        </div>
                                        <Switch
                                            id="dark-mode"
                                            checked={isDarkMode}
                                            onCheckedChange={setIsDarkMode}
                                        />
                                    </div>
                                </div>
                            </div>
                        </UNCardContent>
                    </UNCard>
                </section>

                {/* Logo Preview and Embed */}
                {selectedAgency && (
                    <section className="space-y-6">
                        {/* Logo Preview */}
                        <UNCard>
                            <UNCardHeader>
                                <UNCardTitle>Logo Preview</UNCardTitle>
                            </UNCardHeader>
                            <UNCardContent>
                                <div className={`flex items-center justify-center min-h-[360px] rounded-lg border-2 border-dashed border-gray-200 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                                    {logoUrl && !logoError ? (
                                        <div className="text-center space-y-4">
                                            <div className={`p-12 rounded-lg inline-block shadow-sm ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                                                {selectedFormat === 'svg' ? (
                                                    <img
                                                        src={logoUrl}
                                                        alt={`${selectedEntity?.entity_long || 'UN'} Logo`}
                                                        className="max-h-48 w-auto"
                                                        style={{ width: includeText ? 420 : 200 }}
                                                        onError={() => setLogoError(true)}
                                                    />
                                                ) : (
                                                    <Image
                                                        src={logoUrl}
                                                        alt={`${selectedEntity?.entity_long || 'UN'} Logo`}
                                                        width={includeText ? 420 : 200}
                                                        height={includeText ? 160 : 200}
                                                        className="max-h-48 w-auto"
                                                        onError={() => setLogoError(true)}
                                                    />
                                                )}
                                            </div>
                                            <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                                {selectedEntity?.entity_long} - {includeText ? "Icon & Text" : "Icon Only"} ({isDarkMode ? "Dark" : "Light"})
                                            </p>
                                        </div>
                                    ) : logoError ? (
                                        <div className="text-center space-y-2 px-4">
                                            <p className="text-gray-400 font-medium">Logo not available</p>
                                            <p className="text-sm text-gray-400">
                                                No {selectedFormat.toUpperCase()} logo found for {selectedEntity?.entity_long || selectedAgency} ({isDarkMode ? "dark" : "light"} mode)
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-gray-400">Select an entity to preview</p>
                                    )}
                                </div>
                            </UNCardContent>
                        </UNCard>

                        {/* Embed Code */}
                        <UNCard>
                            <UNCardHeader>
                                <UNCardTitle>Embed Code</UNCardTitle>
                            </UNCardHeader>
                            <UNCardContent>
                                <div className="space-y-4">
                                    <div className="relative">
                                        <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-x-auto border border-gray-200">
                                            <code className="text-gray-800">{getEmbedCode()}</code>
                                        </pre>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="absolute top-2 right-2 shadow-none"
                                            onClick={handleCopyEmbed}
                                        >
                                            <Copy className="h-4 w-4 mr-2" />
                                            {copied ? "Copied!" : "Copy"}
                                        </Button>
                                    </div>

                                    <div className="flex gap-3">
                                        <Button 
                                            className="flex-1 bg-un-blue hover:bg-un-blue/90 text-white"
                                            onClick={handleDownload}
                                        >
                                            <Download className="h-4 w-4 mr-2" />
                                            Download Logo
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            className="shadow-none hover:bg-gray-50"
                                            onClick={() => document.getElementById('usage-guidelines')?.scrollIntoView({ behavior: 'smooth' })}
                                        >
                                            View Guidelines
                                        </Button>
                                    </div>
                                </div>
                            </UNCardContent>
                        </UNCard>

                        {/* Usage Information */}
                        <UNCard id="usage-guidelines" className="bg-blue-50 border-un-blue">
                            <UNCardContent className="pt-6">
                                <div className="flex gap-3">
                                    <div className="flex-shrink-0 w-1 bg-un-blue rounded-full"></div>
                                    <div>
                                        <h3 className="font-semibold text-foreground mb-2">
                                            Usage Guidelines
                                        </h3>
                                        <ul className="space-y-1 text-sm text-gray-700">
                                            <li>• UN logos are protected intellectual property and must be used in accordance with official guidelines</li>
                                            <li>• Maintain adequate clear space around the logo</li>
                                            <li>• Do not alter, distort, or modify the logo in any way</li>
                                            <li>• Use appropriate formats: SVG/PDF for print, PNG/JPG for web</li>
                                        </ul>
                                    </div>
                                </div>
                            </UNCardContent>
                        </UNCard>
                    </section>
                )}
                </>)}
            </div>
        </main>
    );
}
