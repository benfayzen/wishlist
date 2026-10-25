<script lang="ts">
    const { text }: { text: string } = $props();
</script>

<div class="m3-processing-notice" role="status">
    <span class="loading" aria-hidden="true"></span>
    <span>{text}</span>
</div>
