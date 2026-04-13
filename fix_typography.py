import re

with open('styles.css', 'r') as f:
    css = f.read()

# 1. Add --font-serif to :root and update --font-main
root_new = """    /* Typography */
    --font-main: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    --font-serif: Constantia, "Lucida Bright", Lucidabright, "Lucida Serif", Lucida, "DejaVu Serif", "Bitstream Vera Serif", "Liberation Serif", Georgia, serif;
"""
css = re.sub(r'/\*\s*Typography\s*\*/.*?--font-mono[^;]+;', root_new + "    --font-mono: 'Courier New', Courier, monospace;", css, flags=re.DOTALL)

# 2. Update body font to serif, increase line height for textbook readability
body_old = """body {
    font-family: var(--font-main);
    color: var(--text-primary);
    line-height: 1.6;
    background-color: var(--background);
}"""
body_new = """body {
    font-family: var(--font-serif);
    color: #111111;
    line-height: 1.8;
    background-color: var(--background);
    font-size: 18px;
    font-weight: 400;
}

h1, h2, h3, h4, h5, h6, .sidebar, .topic-title, .callout-title {
    font-family: var(--font-main);
}
"""
css = css.replace(body_old, body_new)

# 3. Simplify the flashy toxic callouts to be simple textbook framing
toxic_old = r'\.callout-toxic\s*\{.*?\.callout-toxic p\s*\{[^\}]+\}'
# wait, toxic might be easier to replace if we just find the whole block. I'll use a simpler replace.
