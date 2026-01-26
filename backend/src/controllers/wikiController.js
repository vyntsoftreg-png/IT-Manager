const wikiService = require('../services/wikiService');

const getTree = async (req, res) => {
    try {
        console.log('Wiki: Fetching tree...');
        const tree = await wikiService.getTree();
        console.log('Wiki: Tree fetched', JSON.stringify(tree));
        res.json({ success: true, data: tree });
    } catch (error) {
        console.error('Wiki tree error:', error);
        res.status(500).json({ success: false, message: 'Failed to load wiki structure' });
    }
};

const getPage = async (req, res) => {
    try {
        const { path } = req.query;
        if (!path) return res.status(400).json({ success: false, message: 'Path is required' });

        const content = await wikiService.getPage(path);
        if (content === null) {
            return res.status(404).json({ success: false, message: 'Page not found' });
        }

        res.json({ success: true, data: content });
    } catch (error) {
        console.error('Wiki get page error:', error);
        res.status(500).json({ success: false, message: 'Failed to load page' });
    }
};

const savePage = async (req, res) => {
    try {
        const { path, content } = req.body;
        if (!path) return res.status(400).json({ success: false, message: 'Path is required' });

        // Basic validation for content
        // content can be empty string if user wants to clear page

        const savedPath = await wikiService.savePage(path, content || '');
        res.json({ success: true, message: 'Page saved', data: { path: savedPath } });
    } catch (error) {
        console.error('Wiki save error:', error);
        res.status(500).json({ success: false, message: 'Failed to save page' });
    }
};

const deletePage = async (req, res) => {
    try {
        const { path } = req.query;
        if (!path) return res.status(400).json({ success: false, message: 'Path is required' });

        await wikiService.deletePage(path);
        res.json({ success: true, message: 'Page deleted' });
    } catch (error) {
        console.error('Wiki delete error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete page' });
    }
};

const search = async (req, res) => {
    try {
        const { query } = req.query;
        const results = await wikiService.search(query);
        res.json({ success: true, data: results });
    } catch (error) {
        console.error('Wiki search error:', error);
        res.status(500).json({ success: false, message: 'Search failed' });
    }
};

module.exports = {
    getTree,
    getPage,
    savePage,
    deletePage,
    search
};
