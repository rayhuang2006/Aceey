<template>
  <div id="problem-panel">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
    
    <div class="panel-header">
      <span>Problem Description</span>
      <button class="toggle-btn" @click="isPreviewMode = !isPreviewMode">
        {{ isPreviewMode ? '編輯 (Edit)' : '預覽 (Preview)' }}
      </button>
    </div>
    
    <div class="panel-content sidebar-content" id="problem-text">
      <textarea 
        v-if="!isPreviewMode" 
        v-model="rawMarkdown" 
        class="markdown-editor" 
        placeholder="在此貼上題目... (支援 Markdown 與 LaTeX 數學公式, 例如 $O(N \log N)$)"
      ></textarea>
      
      <div 
        v-else 
        class="markdown-body" 
        v-html="renderedHtml"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { Marked } from 'marked';
import markedKatex from 'marked-katex-extension';
import DOMPurify from 'dompurify';

const isPreviewMode = ref(false);
const rawMarkdown = ref("");

// Setup marked with KaTeX support
const marked = new Marked();
marked.use(markedKatex({ 
  throwOnError: false, 
  displayMode: false 
}));

const renderedHtml = computed(() => {
  if (!rawMarkdown.value) return "";
  
  const rawHtml = marked.parse(rawMarkdown.value);
  
  // Sanitize while preserving KaTeX elements
  return DOMPurify.sanitize(rawHtml, {
    ADD_TAGS: ['math', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'ms', 'mspace', 'mtext', 'mfrac', 'msqrt', 'mroot', 'mstyle', 'merror', 'mpadded', 'mphantom', 'mfenced', 'menclose', 'msub', 'msup', 'msubsup', 'munder', 'mover', 'munderover', 'mmultiscripts', 'mtable', 'mtr', 'mtd', 'maligngroup', 'malignmark', 'annotation', 'annotation-xml'],
    ADD_ATTR: ['mathvariant', 'display', 'xmlns', 'style', 'class', 'aria-hidden']
  });
});
</script>

<style scoped>
#problem-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: var(--bg-darker, #121212);
  border-bottom: 1px solid var(--border-color, #333);
}

.toggle-btn {
  background: transparent;
  color: var(--accent-green, #4caf50);
  border: 1px solid var(--accent-green, #4caf50);
  border-radius: 4px;
  padding: 2px 12px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-btn:hover {
  background: var(--accent-green, #4caf50);
  color: #fff;
}

#problem-text {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
  background-color: var(--bg-panel, #252526);
}

.markdown-editor {
  flex-grow: 1;
  width: 100%;
  height: 100%;
  padding: 16px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 14px;
  color: #e0e0e0;
  background-color: transparent;
  border: none;
  resize: none;
  outline: none;
  line-height: 1.5;
}

.markdown-editor::placeholder {
  color: #666;
  font-style: italic;
}

.markdown-body {
  padding: 16px;
  overflow-y: auto;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  font-size: 14px;
  line-height: 1.6;
  color: #d1d5db;
  height: 100%;
  word-wrap: break-word;
}

/* Markdown Base Styles */
.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4) {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25;
  color: #fff;
}

.markdown-body :deep(h1) { font-size: 1.8em; border-bottom: 1px solid #333; padding-bottom: .3em; }
.markdown-body :deep(h2) { font-size: 1.5em; border-bottom: 1px solid #333; padding-bottom: .3em; }
.markdown-body :deep(h3) { font-size: 1.25em; }

.markdown-body :deep(p) { margin-top: 0; margin-bottom: 16px; }
.markdown-body :deep(a) { color: #58a6ff; text-decoration: none; }
.markdown-body :deep(a:hover) { text-decoration: underline; }

.markdown-body :deep(code) {
  padding: 0.2em 0.4em;
  margin: 0;
  font-size: 85%;
  background-color: rgba(110, 118, 129, 0.4);
  border-radius: 6px;
  font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
}

.markdown-body :deep(pre) {
  padding: 16px;
  overflow: auto;
  font-size: 85%;
  line-height: 1.45;
  background-color: #161b22;
  border-radius: 6px;
  margin-bottom: 16px;
}

.markdown-body :deep(pre code) {
  padding: 0;
  background-color: transparent;
  border-radius: 0;
}

.markdown-body :deep(blockquote) {
  padding: 0 1em;
  color: #8b949e;
  border-left: 0.25em solid #30363d;
  margin: 0 0 16px 0;
}

.markdown-body :deep(ul), .markdown-body :deep(ol) {
  padding-left: 2em;
  margin-bottom: 16px;
}

.markdown-body :deep(.katex) {
  font-size: 1.1em;
}

.markdown-body :deep(.katex-display) {
  overflow-x: auto;
  overflow-y: hidden;
  padding: 8px 0;
}
</style>
