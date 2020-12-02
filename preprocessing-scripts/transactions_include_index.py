# -*- coding: utf-8 -*-
"""
Created on Sun Nov 29 12:54:20 2020

@author: Aviva Prins, for Tanya Shroff
"""

import pandas as pd

decades = ['8', '9', '0', '1']
years = [decade + str(i) for decade in decades for i in range(0,10,2)] + ['20']

transaction_types = ['indiv', 'cm']

for transaction_type in transaction_types:
    for year_str in years:
        print(f'Starting year {year_str}')
        
        if transaction_type == 'indiv':
            filepath = f'../data/transactions/agg_indiv_contrib/indiv{year_str}.txt'
            
        elif transaction_type == 'cm':
            filepath = f'../data/transactions/agg_cm_trans/cm_trans{year_str}.txt'
           
        
        df = pd.read_csv(filepath, sep='|')
        df.to_csv(filepath, sep='|', index=True)