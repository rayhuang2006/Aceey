<template>
  <div id="problem-panel">
    <div class="panel-header">Problem Description</div>
    <div class="panel-content sidebar-content" contenteditable="true" id="problem-text" style="font-family: monospace;"></div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.sidebar-content:empty:before {
  content: "Paste problem description here...";
  color: #666;
  font-style: italic;
}
</style>
