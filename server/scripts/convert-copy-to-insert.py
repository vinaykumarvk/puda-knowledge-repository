#!/usr/bin/env python3
"""
Convert COPY ... FROM stdin statements to INSERT statements
for Supabase SQL Editor compatibility
"""
import re
import os

def convert_copy_to_insert(content):
    """Convert COPY statements to INSERT statements"""
    lines = content.split('\n')
    output = []
    i = 0
    
    while i < len(lines):
        line = lines[i]
        
        # Match COPY statement
        copy_match = re.match(r'^COPY public\.(\w+) \((.+)\) FROM stdin;', line)
        if copy_match:
            table_name = copy_match.group(1)
            columns = [col.strip() for col in copy_match.group(2).split(',')]
            
            # Skip the COPY line
            i += 1
            
            # Collect data rows until we hit \.
            data_rows = []
            while i < len(lines) and lines[i].strip() != '\\.':
                data_line = lines[i].strip()
                if data_line:  # Skip empty lines
                    # Split by tab
                    values = data_line.split('\t')
                    data_rows.append(values)
                i += 1
            
            # Skip the \. line
            i += 1
            
            # Convert to INSERT statements
            # Group inserts for efficiency (multiple rows per INSERT)
            batch_size = 100  # Insert 100 rows at a time
            for batch_start in range(0, len(data_rows), batch_size):
                batch = data_rows[batch_start:batch_start + batch_size]
                
                # Build INSERT statement
                insert_sql = f"INSERT INTO public.{table_name} ({', '.join(columns)}) VALUES\n"
                
                value_lines = []
                for row in batch:
                    # Escape values properly
                    escaped_values = []
                    for val in row:
                        if val == '\\N':  # NULL
                            escaped_values.append('NULL')
                        elif val == '':
                            escaped_values.append("''")
                        else:
                            # Escape single quotes and wrap in quotes
                            escaped = val.replace("'", "''")
                            escaped_values.append(f"'{escaped}'")
                    
                    value_lines.append(f"({', '.join(escaped_values)})")
                
                insert_sql += ',\n'.join(value_lines) + ';\n'
                output.append(insert_sql)
        else:
            output.append(line)
            i += 1
    
    return '\n'.join(output)

def process_file(input_file, output_file):
    """Process a single file"""
    with open(input_file, 'r') as f:
        content = f.read()
    
    converted = convert_copy_to_insert(content)
    
    with open(output_file, 'w') as f:
        f.write(converted)
    
    print(f"✅ Converted {input_file} -> {output_file}")

if __name__ == '__main__':
    # Process all SQL files in pg_dump_split
    os.makedirs('pg_dump_split_converted', exist_ok=True)
    
    for filename in sorted(os.listdir('pg_dump_split')):
        if filename.endswith('.sql'):
            input_path = f'pg_dump_split/{filename}'
            output_path = f'pg_dump_split_converted/{filename}'
            process_file(input_path, output_path)
    
    print("\n✅ All files converted!")
    print("📁 Converted files are in pg_dump_split_converted/ directory")
    print("   Use these files in Supabase SQL Editor instead of pg_dump_split/")
