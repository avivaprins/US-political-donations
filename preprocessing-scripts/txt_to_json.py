# -*- coding: utf-8 -*-
"""
Created on Sun Nov 15 14:20:52 2020

@author: Aviva

Converts a |-separated txt file to a json.
"""
import pandas as pd


def txt_to_json(year):
    trans_indiv_filepath = f'../data/cleaned_tables/transactions_final/agg_indiv_contrib/indiv{year}.txt'
    trans_comm_filepath = f'../data/cleaned_tables/transactions_final/agg_cm_trans/cm_trans{year}.txt'
    comm_filepath = f'../data/cleaned_tables/committees/cm{year}.txt'
    cand_filepath = f'../data/cleaned_tables/candidates/cn{year}.txt'
    
    trans_indiv_save_filepath = f'../data/cleaned_JSONs/transactions/agg_indiv_contrib/indiv{year}.json'
    trans_comm_save_filepath = f'../data/cleaned_JSONs/transactions/agg_cm_trans/cm_trans{year}.json'
    comm_save_filepath = f'../data/cleaned_JSONs/committees/cm{year}.json'
    cand_save_filepath = f'../data/cleaned_JSONs/candidates/cn{year}.json'
    
    filepaths = [trans_indiv_filepath, trans_comm_filepath, comm_filepath, cand_filepath]
    save_filepaths = [trans_indiv_save_filepath, trans_comm_save_filepath, comm_save_filepath, cand_save_filepath]
    
    for i in range(4):
        filepath = filepaths[i]
        save_filepath = save_filepaths[i]
        
        df = pd.read_csv(filepath, sep='|')
        df.to_json(save_filepath, orient='index')
        
decades = ['0', '1', '8', '9']
years = [decade + str(i) for decade in decades for i in range(0,10,2)]

for year in years:
    txt_to_json(year)
