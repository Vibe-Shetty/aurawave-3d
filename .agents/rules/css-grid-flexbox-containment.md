# CSS Grid & Flexbox Layout Containment

To prevent text clipping and container overflow in responsive cards and grid lists:

1. **Flex & Grid Child Min-Width**:
   - Always specify `min-width: 0` on flex items and grid items containing text.
   - Set `overflow: hidden` and `box-sizing: border-box` on card containers.

2. **Text Truncation**:
   - For single-line text with ellipsis:
     ```css
     white-space: nowrap;
     overflow: hidden;
     text-overflow: ellipsis;
     display: block;
     width: 100%;
     max-width: 100%;
     ```
   - For multi-line clamped text:
     ```css
     display: -webkit-box;
     -webkit-line-clamp: 2;
     -webkit-box-orient: vertical;
     overflow: hidden;
     ```
