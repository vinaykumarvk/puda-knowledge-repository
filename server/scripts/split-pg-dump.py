#!/usr/bin/env python3
"""
Split pg_dump.sql into smaller files for Supabase SQL Editor
"""
import re
import os

def split_pg_dump():
    # Read the original file
    with open('pg_dump.sql', 'r') as f:
        content = f.read()
    
    lines = content.split('\n')
    
    # Find header (everything before first CREATE TABLE)
    header_end = 0
    for i, line in enumerate(lines):
        if line.startswith('CREATE TABLE public.'):
            header_end = i
            break
    
    header = '\n'.join(lines[:header_end])
    
    # Find all table sections
    tables = []
    current_table = None
    in_copy = False
    
    for i, line in enumerate(lines):
        if line.startswith('CREATE TABLE public.'):
            table_name = line.split('public.')[1].split('(')[0].strip()
            tables.append({
                'name': table_name,
                'create_start': i,
                'create_end': None,
                'copy_start': None,
                'copy_end': None
            })
            current_table = len(tables) - 1
        elif line.startswith(');') and current_table is not None and tables[current_table]['create_end'] is None:
            # Find the end of CREATE TABLE (look for ); after CREATE)
            tables[current_table]['create_end'] = i
        elif line.startswith('COPY public.'):
            if current_table is not None:
                tables[current_table]['copy_start'] = i
                in_copy = True
        elif in_copy and line.strip() == '\\.':
            if current_table is not None:
                tables[current_table]['copy_end'] = i
                in_copy = False
    
    # Find constraints section (starts after last COPY)
    constraints_start = None
    for i, line in enumerate(lines):
        if line.startswith('ALTER TABLE ONLY public.'):
            constraints_start = i
            break
    
    constraints = '\n'.join(lines[constraints_start:]) if constraints_start else ''
    
    # Group tables logically
    # File 1: Core system tables (users, sessions, threads, messages, conversations)
    file1_tables = ['users', 'sessions', 'threads', 'messages', 'conversations']
    
    # File 2: Quiz and learning
    file2_tables = ['quiz_questions', 'quiz_attempts', 'quiz_responses', 'user_mastery', 'ba_knowledge_questions']
    
    # File 3: Investment and approval workflow
    file3_tables = ['investment_requests', 'approvals', 'tasks', 'notifications', 'investment_rationales']
    
    # File 4: Documents and templates
    file4_tables = ['documents', 'document_categories', 'document_category_associations', 
                    'templates', 'solution_templates', 'template_sections', 'template_work_items', 
                    'template_revisions']
    
    # File 5: Everything else + constraints
    file5_tables = [t['name'] for t in tables if t['name'] not in 
                    file1_tables + file2_tables + file3_tables + file4_tables]
    
    def write_file(filename, table_names, include_constraints=False):
        parts = [header]
        
        # Add CREATE TABLE statements
        for table_name in table_names:
            table_info = next((t for t in tables if t['name'] == table_name), None)
            if table_info and table_info['create_start'] is not None:
                create_end = table_info['create_end'] or table_info['create_start'] + 50
                parts.append('\n'.join(lines[table_info['create_start']:create_end+1]))
        
        # Add sequences and indexes for these tables (simplified - add all)
        # Find sequences
        for i, line in enumerate(lines):
            if 'CREATE SEQUENCE' in line or 'ALTER SEQUENCE' in line:
                # Add sequence if it relates to our tables
                for table_name in table_names:
                    if f'{table_name}_id_seq' in line:
                        # Find the end of this sequence block
                        j = i
                        while j < len(lines) and not (lines[j].strip() == '' and j > i + 5):
                            j += 1
                        parts.append('\n'.join(lines[i:j+1]))
                        break
        
        # Add COPY statements
        for table_name in table_names:
            table_info = next((t for t in tables if t['name'] == table_name), None)
            if table_info and table_info['copy_start'] is not None:
                copy_end = table_info['copy_end'] or table_info['copy_start'] + 100
                parts.append('\n'.join(lines[table_info['copy_start']:copy_end+1]))
        
        if include_constraints:
            parts.append(constraints)
        
        with open(filename, 'w') as f:
            f.write('\n\n'.join(parts))
        print(f"Created {filename} ({len(parts)} sections)")
    
    # Create output directory
    os.makedirs('pg_dump_split', exist_ok=True)
    
    # Write files
    write_file('pg_dump_split/01_schema_and_core_tables.sql', file1_tables)
    write_file('pg_dump_split/02_quiz_and_learning.sql', file2_tables)
    write_file('pg_dump_split/03_investment_and_approvals.sql', file3_tables)
    write_file('pg_dump_split/04_documents_and_templates.sql', file4_tables)
    write_file('pg_dump_split/05_remaining_tables_and_constraints.sql', file5_tables, include_constraints=True)
    
    print("\n✅ Split complete! Files created in pg_dump_split/ directory")
    print("\nRun them in order:")
    for i in range(1, 6):
        print(f"  {i}. pg_dump_split/0{i}_*.sql")

if __name__ == '__main__':
    split_pg_dump()
