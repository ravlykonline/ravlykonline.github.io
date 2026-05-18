param(
    [switch]$Apply,
    [switch]$SkipBackup
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$sourceRoot = Split-Path -Parent $scriptDir
$repoRoot = Split-Path -Parent $sourceRoot

if (-not (Test-Path (Join-Path $repoRoot '.git'))) {
    throw "Expected repo root at '$repoRoot' with a .git directory."
}

if ((Split-Path $sourceRoot -Leaf) -ne 'v4beta') {
    throw "This script must live inside the v4beta directory."
}

$publicDirectories = @(
    'assets',
    'css',
    'js',
    'resources'
)

$publicFiles = @(
    'index.html',
    'manual.html',
    'lessons.html',
    'resources.html',
    'about.html',
    'quiz.html',
    'teacher_guidelines.html',
    'advice_for_parents.html',
    'zen.html',
    'sw.js',
    'ravlyk.jpg',
    'robots.txt',
    'sitemap.xml',
    'site.webmanifest',
    'android-chrome-192x192.png',
    'android-chrome-512x512.png',
    'apple-touch-icon.png',
    'favicon-16x16.png',
    'favicon-32x32.png',
    'favicon.ico',
    'README.md'
)

$retiredRootEntries = @(
    'resourсes.html'
)

$retiredRootNamePatterns = @(
    '^resourсes\.html$'
)

function Write-Step([string]$message) {
    Write-Host $message
}

function Remove-Target([string]$targetPath) {
    if (-not (Test-Path $targetPath)) {
        return
    }

    if ($Apply) {
        Remove-Item -LiteralPath $targetPath -Recurse -Force
    }

    Write-Step ("{0} {1}" -f ($(if ($Apply) { 'Removed' } else { 'Would remove' }), $targetPath))
}

function Copy-SourceToTarget([string]$sourcePath, [string]$targetPath) {
    if (-not (Test-Path $sourcePath)) {
        throw "Missing source item: $sourcePath"
    }

    if ($Apply) {
        Copy-Item -LiteralPath $sourcePath -Destination $targetPath -Recurse -Force
    }

    Write-Step ("{0} {1} -> {2}" -f ($(if ($Apply) { 'Copied' } else { 'Would copy' }), $sourcePath, $targetPath))
}

function Backup-ExistingPublicRoot {
    $backupStamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $backupRoot = Join-Path $repoRoot ("old\deploy-backup-{0}" -f $backupStamp)
    $itemsToBackup = @()

    foreach ($entry in ($publicDirectories + $publicFiles + $retiredRootEntries)) {
        $rootPath = Join-Path $repoRoot $entry
        if (Test-Path $rootPath) {
            $itemsToBackup += $entry
        }
    }

    if (-not $itemsToBackup.Count) {
        Write-Step 'No existing public root items to back up.'
        return
    }

    if ($Apply) {
        New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
    }

    foreach ($entry in $itemsToBackup) {
        $rootPath = Join-Path $repoRoot $entry
        $backupPath = Join-Path $backupRoot $entry
        if ($Apply) {
            $backupParent = Split-Path -Parent $backupPath
            if ($backupParent) {
                New-Item -ItemType Directory -Path $backupParent -Force | Out-Null
            }
            Copy-Item -LiteralPath $rootPath -Destination $backupPath -Recurse -Force
        }
        Write-Step ("{0} {1} -> {2}" -f ($(if ($Apply) { 'Backed up' } else { 'Would back up' }), $rootPath, $backupPath))
    }
}

Write-Step ("Mode: {0}" -f ($(if ($Apply) { 'APPLY' } else { 'DRY RUN' })))
Write-Step ("Source root: $sourceRoot")
Write-Step ("Repo root:   $repoRoot")
Write-Step 'Protected repo items: .git, .github, old, v4beta'

if (-not $SkipBackup) {
    Backup-ExistingPublicRoot
} else {
    Write-Step 'Skipping backup by request.'
}

foreach ($entry in $retiredRootEntries) {
    Remove-Target (Join-Path $repoRoot $entry)
}

Get-ChildItem -LiteralPath $repoRoot -File | ForEach-Object {
    foreach ($pattern in $retiredRootNamePatterns) {
        if ($_.Name -match $pattern) {
            Remove-Target $_.FullName
            break
        }
    }
}

foreach ($entry in ($publicDirectories + $publicFiles)) {
    $targetPath = Join-Path $repoRoot $entry
    $sourcePath = Join-Path $sourceRoot $entry
    Remove-Target $targetPath
    Copy-SourceToTarget $sourcePath $targetPath
}

Write-Step 'Promotion plan completed.'
if (-not $Apply) {
    Write-Step 'Dry run only. Re-run with -Apply to execute the copy.'
}

