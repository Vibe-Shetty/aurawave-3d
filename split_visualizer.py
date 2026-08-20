import os

def main():
    with open('visualizer.js', 'r', encoding='utf-8') as f:
        lines = f.readlines()

    sections = []
    current_section = []
    for line in lines:
        if line.startswith('// ====') and len(current_section) > 0:
            sections.append(current_section)
            current_section = [line]
        else:
            current_section.append(line)
    sections.append(current_section)

    files = {
        'src/state.js': [0, 1, 2],
        'src/render.js': [3, 4, 5, 6, 19, 20],
        'src/audio.js': [7, 8],
        'src/ui.js': [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 21, 22]
    }

    for filename, block_indices in files.items():
        with open(filename, 'w', encoding='utf-8') as out:
            for idx in block_indices:
                if idx < len(sections):
                    out.writelines(sections[idx])
            print(f"Wrote {filename}")

if __name__ == '__main__':
    main()
