#!/usr/bin/env python
"""
简单测试脚本
"""

with open('simple_test_output.txt', 'w') as f:
    f.write("开始测试\n")
    f.write("测试写入文件\n")
    f.write("测试完成\n")

print("脚本执行完成")