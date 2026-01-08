#!/usr/bin/env python3
"""
Final improved script to split pg_dump.sql into manageable files
Separates large data tables into their own files
"""
import re
import os

def find_table_sections(lines):
    """Find all table CREATE and COPY sections"""
    tables = {}
    current_table = None
    in_create = False
    in_copy = False
    
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
        
        # End of CREATE TABLE
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
        
        # End of COPY
        elif in_copy and line.strip() == '\\.':
            if current_table and current_table in tables:
                tables[current_table]['copy_end'] = i
            in_copy = False
    
    return tables

def extract_lines(lines, start, end):
    """Extract lines between start and end (inclusive)"""
    if start is None or end is None:
        return []
    return lines[start:end+1]

def split_pg_dump():
    with open('pg_dump.sql', 'r') as f:
        lines = f.readlines()
    
    # Find header
    header_end = 0
    for i, line in enumerate(lines):
        if line.startswith('CREATE TABLE public.'):
            header_end = i
            break
    
    header_lines = lines[:header_end]
    
    # Find all tables
    tables = find_table_sections(lines)
    
    # Find constraints
    constraints_start = None
    for i, line in enumerate(lines):
        if line.startswith('ALTER TABLE ONLY public.'):
            constraints_start = i
            break
    
    constraints_lines = lines[constraints_start:] if constraints_start else []
    
    # Group tables - separate large data tables
    groups = {
        '01_schema_setup': [],  # Just header and extensions
        '02_core_tables': ['users', 'sessions', 'threads', 'conversations'],
        '03_messages_data': ['messages'],  # Large table - separate file
        '04_quiz_and_learning': [
            'quiz_questions', 'quiz_attempts', 'quiz_responses', 
            'user_mastery', 'ba_knowledge_questions'
        ],
        '05_investment_and_approvals': [
            'investment_requests', 'approvals', 'tasks', 
            'notifications', 'investment_rationales'
        ],
        '06_documents_and_templates': [
            'documents', 'document_categories', 'document_category_associations',
            'templates', 'solution_templates', 'template_sections', 
            'template_work_items', 'template_revisions'
        ],
        '07_response_cache': ['response_cache'],  # Large table with vectors
        '08_other_tables': [
            'historical_rfps', 'excel_requirement_responses',
            'reference_responses', 'rfp_responses', 'background_jobs',
            'cross_document_queries', 'deep_mode_jobs', 'document_queries',
            'sequences', 'web_search_queries'
        ]
    }
    
    def write_file(filename, table_names, include_header=True, include_constraints=False):
        output = []
        
        if include_header:
            output.extend(header_lines)
            output.append('')
        
        # Add CREATE TABLE statements
        for table_name in table_names:
            if table_name not in tables:
                continue
            
            table_info = tables[table_name]
            
            if table_info['create_start'] is not None:
                create_end = table_info['create_end'] or table_info['create_start'] + 100
                output.extend(extract_lines(lines, table_info['create_start'], create_end))
                output.append('')
        
        # Add sequences for these tables
        for i, line in enumerate(lines):
            if any(f'{tn}_id_seq' in line for tn in table_names) and ('CREATE SEQUENCE' in line or 'ALTER SEQUENCE' in line):
                j = i + 1
                while j < len(lines) and lines[j].strip() and not lines[j].startswith(('CREATE', 'ALTER', 'SET', 'COPY')):
                    j += 1
                output.extend(lines[i:j])
                output.append('')
        
        # Add COPY statements with data
        for table_name in table_names:
            if table_name not in tables:
                continue
            
            table_info = tables[table_name]
            
            if table_info['copy_start'] is not None and table_info['copy_end'] is not None:
                output.extend(extract_lines(lines, table_info['copy_start'], table_info['copy_end']))
                output.append('')
        
        if include_constraints:
            output.extend(constraints_lines)
        
        os.makedirs('pg_dump_split', exist_ok=True)
        filepath = f'pg_dump_split/{filename}.sql'
        with open(filepath, 'w') as f:
            f.write(''.join(output))
        
        size_kb = len(''.join(output)) / 1024
        size_mb = size_kb / 1024
        if size_mb > 1:
            print(f"✅ Created {filepath} ({size_mb:.1f} MB)")
        else:
            print(f"✅ Created {filepath} ({size_kb:.1f} KB)")
    
    # Write files
    # File 1: Just schema setup (no tables)
    write_file('01_schema_setup', [], include_header=True)
    
    # File 2: Core tables (users, sessions, threads, conversations) - no messages yet
    write_file('02_core_tables', groups['02_core_tables'], include_header=False)
    
    # File 3: Messages data (large - separate)
    write_file('03_messages_data', groups['03_messages_data'], include_header=False)
    
    # File 4: Quiz tables
    write_file('04_quiz_and_learning', groups['04_quiz_and_learning'], include_header=False)
    
    # File 5: Investment tables
    write_file('05_investment_and_approvals', groups['05_investment_and_approvals'], include_header=False)
    
    # File 6: Document tables
    write_file('06_documents_and_templates', groups['06_documents_and_templates'], include_header=False)
    
    # File 7: Response cache (large vectors - separate)
    write_file('07_response_cache', groups['07_response_cache'], include_header=False)
    
    # File 8: Other tables + constraints
    write_file('08_other_tables_and_constraints', groups['08_other_tables'], include_header=False, include_constraints=True)
    
    print("\n✅ Split complete! 8 files created")
    print("\n📋 Run them in this order in Supabase SQL Editor:")
    for i in range(1, 9):
        print(f"   {i}. pg_dump_split/0{i}_*.sql")

if __name__ == '__main__':
    split_pg_dump()
