import 'package:flutter/material.dart';
import '../widgets/navbar.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Home'),
        actions: [
          IconButton(onPressed: () {}, icon: const Icon(Icons.search)),
          IconButton(onPressed: () {}, icon: const Icon(Icons.notifications)),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Card(
              elevation: 4,
              child: ListTile(
                title: const Text('Portfolio Balance'),
                subtitle: const Text('₹ 1,20,000'),
                trailing: const Icon(Icons.arrow_forward),
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'Investments',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            Expanded(
              child: ListView(
                children: [
                  ListTile(
                    leading: const Icon(Icons.trending_up),
                    title: const Text('Stocks'),
                    trailing: const Text('+5.4%'),
                  ),
                  ListTile(
                    leading: const Icon(Icons.pie_chart),
                    title: const Text('Mutual Funds'),
                    trailing: const Text('+2.1%'),
                  ),
                  ListTile(
                    leading: const Icon(Icons.currency_bitcoin),
                    title: const Text('Cryptocurrency'),
                    trailing: const Text('-3.2%'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: const NavBar(),
    );
  }
}
