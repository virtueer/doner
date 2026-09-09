export function copyText(text: string) {
	if (navigator.clipboard && window.isSecureContext) {
		navigator.clipboard.writeText(text);
		return;
	}

	const textArea = document.createElement("textarea");
	textArea.value = text;
	textArea.style.position = "fixed";
	textArea.style.left = "-999999px";
	document.body.appendChild(textArea);
	textArea.select();
	try {
		document.execCommand("copy");
	} catch (error) {
		console.error("Fallback copy failed", error);
	}
	textArea.remove();
}
