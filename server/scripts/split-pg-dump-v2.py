#!/usr/bin/env python3
"""
Improved script to split pg_dump.sql into smaller files
Properly handles COPY data sections
"""
import re
import os

def find_section_boundaries(lines):
    """Find start and end of each table section"""
    tables = {}
    current_table = None
    in_create = False
    in_copy = False
    create_start = None
    
    for i, line in enumerate(lines):
        # CREATE TABLE
        if line.startswith('CREATE TABLE public.'):
            table_name = line.split('public.')[1].split('(')[0].strip()
            tables[table_name] = {
                'create_start': i,
                'create_end': None,
                'copy_start': None,
                'copy_end': None
            }
            current_table = table_name
            in_create = True
            create_start = i
        
        # End of CREATE TABLE (find the closing );)
        elif in_create and line.strip() == ');':
            if current_table:
                tables[current_table]['create_end'] = i
            in_create = False
        
        # COPY statement
        elif line.startswith('COPY public.'):
            table_name = line.split('public.')[1].split('(')[0].strip()
            if table_name in tables:
                tables[table_name]['copy_start'] = i
                in_copy = True
                current_table = table_name
        
        # End of COPY (\. on its own line)
        elif in_copy and line.strip() == '\\.':
            if current_table and current_table in tables:
                tables[current_table]['copy_end'] = i
            in_copy = False
            current_table = None
    
    return tables

def extract_section(lines, start, end):
    """Extract a section of lines"""
    if start is None or end is None:
        return []
    return lines[start:end+1]

def split_pg_dump():
    # Read file
    with open('pg_dump.sql', 'r') as f:
        lines = f.readlines()
    
    # Find header (before first CREATE TABLE)
    header_end = 0
    for i, line in enumerate(lines):
        if line.startswith('CREATE TABLE public.'):
            header_end = i
            break
    
    header_lines = lines[:header_end]
    
    # Find all table sections
    tables = find_section_boundaries(lines)
    
    # Find constraints section
    constraints_start = None
    for i, line in enumerate(lines):
        if line.startswith('ALTER TABLE ONLY public.'):
            constraints_start = i
            break
    
    constraints_lines = lines[constraints_start:] if constraints_start else []
    
    # Group tables logically
    groups = {
        '01_schema_and_core_tables': [
            'users', 'sessions', 'threads', 'messages', 'conversations'
        ],
        '02_quiz_and_learning': [
            'quiz_questions', 'quiz_attempts', 'quiz_responses', 
            'user_mastery', 'ba_knowledge_questions'
        ],
        '03_investment_and_approvals': [
            'investment_requests', 'approvals', 'tasks', 
            'notifications', 'investment_rationales'
        ],
        '04_documents_and_templates': [
            'documents', 'document_categories', 'document_category_associations',
            'templates', 'solution_templates', 'template_sections', 
            'template_work_items', 'template_revisions'
        ],
        '05_other_tables_part1': [
            'response_cache', 'historical_rfps', 'excel_requirement_responses',
            'reference_responses', 'rfp_responses'
        ],
        '06_other_tables_part2': [
            'background_jobs', 'cross_document_queries', 'deep_mode_jobs',
            'document_queries', 'sequences', 'web_search_queries'
        ]
    }
    
    def write_file(filename, table_names, include_constraints=False):
        output = []
        
        # Add header
        output.extend(header_lines)
        output.append('')
        
        # Add CREATE TABLE statements and sequences
        for table_name in table_names:
            if table_name not in tables:
                continue
            
            table_info = tables[table_name]
            
            # Add CREATE TABLE
            if table_info['create_start'] is not None:
                create_end = table_info['create_end'] or table_info['create_start'] + 100
                output.extend(extract_section(lines, table_info['create_start'], create_end))
                output.append('')
            
            # Find and add related sequences
            for i, line in enumerate(lines):
                if f'{table_name}_id_seq' in line and ('CREATE SEQUENCE' in line or 'ALTER SEQUENCE' in line):
                    # Find end of sequence block (next empty line or next statement)
                    j = i + 1
                    while j < len(lines) and lines[j].strip() and not lines[j].startswith(('CREATE', 'ALTER', 'SET')):
                        j += 1
                    output.extend(lines[i:j])
                    output.append('')
        
        # Add COPY statements with data
        for table_name in table_names:
            if table_name not in tables:
                continue
            
            table_info = tables[table_name]
            
            if table_info['copy_start'] is not None and table_info['copy_end'] is not None:
                output.extend(extract_section(lines, table_info['copy_start'], table_info['copy_end']))
                output.append('')
        
        # Add constraints if this is the last file
        if include_constraints:
            output.extend(constraints_lines)
        
        # Write file
        os.makedirs('pg_dump_split', exist_ok=True)
        filepath = f'pg_dump_split/{filename}.sql'
        with open(filepath, 'w') as f:
            f.write(''.join(output))
        
        size_kb = len(''.join(output)) / 1024
        print(f"✅ Created {filepath} ({size_kb:.1f} KB)")
    
    # Write all files
    write_file('01_schema_and_core_tables', groups['01_schema_and_core_tables'])
    write_file('02_quiz_and_learning', groups['02_quiz_and_learning'])
    write_file('03_investment_and_approvals', groups['03_investment_and_approvals'])
    write_file('04_documents_and_templates', groups['04_documents_and_templates'])
    write_file('05_other_tables_part1', groups['05_other_tables_part1'])
    write_file('06_other_tables_part2_and_constraints', groups['06_other_tables_part2'], include_constraints=True)
    
    print("\n✅ Split complete! 6 files created in pg_dump_split/ directory")
    print("\nRun them in this order:")
    for i in range(1, 7):
        print(f"  {i}. pg_dump_split/0{i}_*.sql")

if __name__ == '__main__':
    split_pg_dump()
