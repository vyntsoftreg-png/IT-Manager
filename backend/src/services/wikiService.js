const fs = require('fs').promises;
const path = require('path');

const WIKI_DIR = path.join(__dirname, '../../data/wiki');

// Ensure wiki directory exists
const ensureWikiDir = async () => {
    try {
        await fs.access(WIKI_DIR);
    } catch {
        await fs.mkdir(WIKI_DIR, { recursive: true });
    }
};

// Initialize
ensureWikiDir();

// Helper: Sanitize path to prevent directory traversal
const getSafePath = (relativePath) => {
    // Remove leading slashes and normalize
    const safeRel = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
    const fullPath = path.join(WIKI_DIR, safeRel);

    // Ensure the path is still within WIKI_DIR
    if (!fullPath.startsWith(WIKI_DIR)) {
        throw new Error('Invalid path');
    }
    return fullPath;
};

// Get directory tree structure
const getTree = async (dir = WIKI_DIR) => {
    console.log('WikiService: Reading dir', dir);
    if (!require('fs').existsSync(dir)) {
        console.log('WikiService: Dir does not exist, creating...');
        await fs.mkdir(dir, { recursive: true });
    }
    const items = await fs.readdir(dir, { withFileTypes: true });

    const tree = await Promise.all(items.map(async (item) => {
        const fullPath = path.join(dir, item.name);
        const relativePath = path.relative(WIKI_DIR, fullPath).replace(/\\/g, '/');

        if (item.isDirectory()) {
            return {
                title: item.name,
                key: relativePath,
                children: await getTree(fullPath),
                isLeaf: false,
                icon: 'FolderOutlined'
            };
        } else if (item.name.endsWith('.md')) {
            return {
                title: item.name.replace('.md', ''),
                key: relativePath,
                isLeaf: true,
                icon: 'FileMarkdownOutlined'
            };
        }
        return null;
    }));

    return tree.filter(Boolean);
};

// Get page content
const getPage = async (pagePath) => {
    const fullPath = getSafePath(pagePath);
    try {
        const content = await fs.readFile(fullPath, 'utf8');
        return content;
    } catch (error) {
        if (error.code === 'ENOENT') return null;
        throw error;
    }
};

// Save page (Create or Update)
const savePage = async (pagePath, content) => {
    let fullPath = getSafePath(pagePath);

    // If no extension, add .md
    if (!fullPath.endsWith('.md')) {
        fullPath += '.md';
    }

    // Ensure parent directory exists
    await fs.mkdir(path.dirname(fullPath), { recursive: true });

    await fs.writeFile(fullPath, content, 'utf8');
    return path.relative(WIKI_DIR, fullPath).replace(/\\/g, '/');
};

// Delete page or directory
const deletePage = async (pagePath) => {
    const fullPath = getSafePath(pagePath);
    const stats = await fs.stat(fullPath);

    if (stats.isDirectory()) {
        await fs.rm(fullPath, { recursive: true, force: true });
    } else {
        await fs.unlink(fullPath);
    }
};

// Search content
const search = async (query) => {
    if (!query || query.length < 2) return [];

    const results = [];
    const lowerQuery = query.toLowerCase();

    const scanDir = async (dir) => {
        const items = await fs.readdir(dir, { withFileTypes: true });

        for (const item of items) {
            const fullPath = path.join(dir, item.name);
            const relativePath = path.relative(WIKI_DIR, fullPath).replace(/\\/g, '/');

            if (item.isDirectory()) {
                await scanDir(fullPath);
            } else if (item.name.endsWith('.md')) {
                // Check filename
                if (item.name.toLowerCase().includes(lowerQuery)) {
                    results.push({ path: relativePath, type: 'title', match: item.name });
                    continue; // Skip content check if title matches
                }

                // Check content
                const content = await fs.readFile(fullPath, 'utf8');
                if (content.toLowerCase().includes(lowerQuery)) {
                    // Get simple snippet
                    const index = content.toLowerCase().indexOf(lowerQuery);
                    const snippet = content.substring(Math.max(0, index - 20), Math.min(content.length, index + 40));
                    results.push({ path: relativePath, type: 'content', match: '...' + snippet + '...' });
                }
            }
        }
    };

    await scanDir(WIKI_DIR);
    return results;
};

module.exports = {
    getTree,
    getPage,
    savePage,
    deletePage,
    search
};
