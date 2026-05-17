<template>
  <div id="problem-panel">
    
    <div class="panel-header">
      <span>Problem Description</span>
      <div class="view-toggle-group">
        <button 
          class="toggle-btn" 
          :class="{ active: !isPreviewMode }" 
          @click="isPreviewMode = false" 
          title="編輯 (Edit)">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
        </button>
        
        <div class="toggle-divider"></div>

        <button 
          class="toggle-btn" 
          :class="{ active: isPreviewMode }" 
          @click="isPreviewMode = true" 
          title="預覽 (Preview)">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
        </button>
      </div>
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
import markdownit from 'markdown-it';
import texmath from 'markdown-it-texmath';
import katex from 'katex';
import DOMPurify from 'dompurify';
import 'katex/dist/katex.min.css';

const isPreviewMode = ref(false);
const rawMarkdown = ref("");

const md = markdownit({ html: true, linkify: true, typographer: true });

md.use(texmath, {
  engine: katex,
  delimiters: 'dollars',
  katexOptions: {
    throwOnError: false,
    strict: false,
    trust: true,
    output: 'htmlAndMathml',
  },
});

const PURIFY_CONFIG = {
  USE_PROFILES: { html: true },
  ADD_TAGS: [
    'semantics', 'annotation', 'math', 'mrow', 'mi', 'mo', 'mn',
    'msup', 'msub', 'mfrac', 'munderover', 'mtd', 'mtr', 'mtable',
    'mspace', 'msqrt', 'mover', 'munder', 'mpadded',
  ],
  ADD_ATTR: [
    'aria-hidden', 'xmlns', 'mathvariant', 'encoding',
    'displaystyle', 'scriptlevel', 'style', 'class',
    'width', 'height', 'viewBox', 'fill', 'd',
  ],
};

const renderedHtml = computed(() => {
  if (!rawMarkdown.value) return '';
  const raw = md.render(rawMarkdown.value);
  return DOMPurify.sanitize(raw, PURIFY_CONFIG);
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

.view-toggle-group {
  display: flex;
  align-items: center;
  background-color: var(--bg-dark, #1e1e1e);
  border: 1px solid var(--border-color, #454545);
  border-radius: 6px;
  padding: 2px;
  height: fit-content;
}

.toggle-btn {
  background: transparent;
  border: none;
  color: #888;
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.toggle-btn:hover {
  color: #ccc;
}

.toggle-btn.active {
  background-color: #3a3d3e;
  color: #fff;
  box-shadow: 0 1px 2px rgba(0,0,0,0.2);
}

.toggle-divider {
  width: 1px;
  height: 12px;
  background-color: var(--border-color, #454545);
  margin: 0 2px;
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
  margin: 1.2em 0;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 8px 0;
}
</style>
