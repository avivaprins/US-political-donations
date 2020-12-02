# -*- coding: utf-8 -*-
"""
Created on Sun Nov  8 11:08:53 2020

@author: Aviva Prins

Migrates transactions between individual contributions vs committee transactions
If the transaction has an employer field, it belongs in individual.
If the transaction has an other_ID (that is, src_ID), it belongs in committee.

THERE ARE **** TRANSACTIONS THAT HAVE BOTH EMPLOYER AND OTHER_ID 
(TIE BREAKING NECESSARY)

NOT USED
"""
import numpy as np
import pandas as pd


# 1. Load the data

year = '00'

# indiv_filepath = f'../data/FEC/transactions/indiv_contrib/indiv{year}.txt'
# indiv_header = pd.read_csv(f'../data/FEC/transactions/indiv_contrib/indiv_header_file.csv')
# indiv_00 = pd.read_csv(indiv_filepath, sep='|', header=0, names=indiv_header.columns)

# transaction_types_in_indiv = np.unique(indiv_00['TRANSACTION_TP'])
# df_indiv_with_OTHERID = indiv_00[~indiv_00['OTHER_ID'].isnull()]
# transaction_types_in_indiv_OTHERID = np.unique(df_indiv_with_OTHERID['TRANSACTION_TP'])
# transaction_types_not_in_indiv_OTHERID = np.unique(indiv_00[indiv_00['OTHER_ID'].isnull()]['TRANSACTION_TP'])
# indiv_head = indiv_00.head(100)



comm_filepath = f'../data/FEC/transactions/cm_trans/cm_trans{year}.txt'
comm_header = pd.read_csv(f'../data/FEC/transactions/cm_trans/cm_header_file.csv')
comm_00 = pd.read_csv(comm_filepath, sep='|', header=0, names=comm_header.columns)

transaction_types_in_comm = np.unique(comm_00['TRANSACTION_TP'])
df_comm_with_EMPLOYER = comm_00[~comm_00['EMPLOYER'].isnull()]
transaction_types_in_comm_EMPLOYER = np.unique(df_comm_with_EMPLOYER['TRANSACTION_TP'])
transaction_types_not_in_comm_EMPLOYER = np.unique(comm_00[comm_00['EMPLOYER'].isnull()]['TRANSACTION_TP'])